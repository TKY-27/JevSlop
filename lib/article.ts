import { load } from 'cheerio';
import { AppError } from './errors';

export function noteUrl(input: unknown): string {
  if (typeof input !== 'string' || input.length > 2048) throw new AppError('INVALID_URL', '公開されたnote記事のURLを入力してください。');
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new AppError('INVALID_URL', 'URLの形式を確認してください。'); }
  if (url.protocol !== 'https:' || url.hostname !== 'note.com' || url.port || url.username || url.password ||
      !/^\/[a-zA-Z0-9_-]+\/n\/n[a-f0-9]+\/?$/.test(url.pathname)) {
    throw new AppError('INVALID_URL', 'https://note.com/ユーザー名/n/記事ID 形式の記事URLに対応しています。');
  }
  // Drop tracking and translation parameters; always evaluate the original prose.
  return `https://note.com${url.pathname.replace(/\/$/, '')}`;
}

export async function readLimited(response: Response, maxBytes: number): Promise<string> {
  if (Number(response.headers.get('content-length')) > maxBytes) {
    await response.body?.cancel();
    throw new AppError('TOO_LARGE', '取得データが大きすぎます。より短い記事を指定してください。', 413);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new AppError('EMPTY_RESPONSE', 'ページを取得できませんでした。時間をおいて再試行してください。', 502);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new AppError('TOO_LARGE', '取得データが大きすぎます。より短い記事を指定してください。', 413);
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  return Buffer.concat(chunks).toString('utf8');
}

export function extractArticle(html: string) {
  const $ = load(html);
  const schema = $('script[type="application/ld+json"]').toArray().flatMap(el => {
    try { const data = JSON.parse($(el).text()); return data['@graph'] ?? [data]; } catch { return []; }
  }).find(item => item['@type'] === 'BlogPosting' || item['@type'] === 'Article');
  if ($('.p-article__paywall, [data-name="paywall"], .o-noteContentHeader__price').length ||
      schema?.isAccessibleForFree === false || schema?.isAccessibleForFree === 'false') {
    throw new AppError('RESTRICTED', '有料・会員限定記事は評価できません。無料で全文公開されている記事を指定してください。');
  }
  // note's explicit body container excludes author, title, recommendations and comments.
  // Fail closed on layout changes instead of accidentally evaluating the whole page.
  const body = $('.note-common-styles__textnote-body').first();
  if (!body.length) throw new AppError('EXTRACTION_FAILED', '記事本文を抽出できませんでした。公開範囲やnoteのページ形式を確認してください。', 422);
  body.find('script, style, noscript, iframe, nav, aside, button, form, [hidden], [aria-hidden="true"], .toc, .note-toc, [data-name="toc"], [embedded-service="note"], [embedded-service="external-article"]').remove();
  body.find('[style]').each((_, el) => { if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test($(el).attr('style') ?? '')) $(el).remove(); });
  body.find('br').replaceWith('\n');
  body.find('p, h1, h2, h3, h4, h5, h6, li, blockquote, pre, tr, div, section, figure, figcaption').each((_, el) => { $(el).prepend('\n').append('\n'); });
  body.find('td, th').append('\t');
  const text = body.text().replace(/\r\n?/g, '\n').replace(/[\t\u00a0 ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (Array.from(text).length < 100) throw new AppError('TOO_SHORT', '評価できる本文が100文字未満です。十分な本文のある公開記事を指定してください。', 422);
  const title = $('h1.o-noteContentHeader__title').first().text().trim() || schema?.headline;
  if (typeof title !== 'string' || !title.trim()) throw new AppError('EXTRACTION_FAILED', '記事タイトルを取得できませんでした。', 422);
  return { title: title.trim(), body: text, characterCount: Array.from(text).length,
    author: typeof schema?.author?.name === 'string' ? schema.author.name : undefined,
    publishedAt: typeof schema?.datePublished === 'string' ? schema.datePublished : undefined,
    extractionMode: 'note-dom' as const };
}

export async function fetchArticle(input: unknown, signal?: AbortSignal, transport: typeof fetch = fetch) {
  let url = noteUrl(input);
  const timeout = AbortSignal.timeout(20_000);
  const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
  try {
    for (let hop = 0; hop < 4; hop++) {
      const response = await transport(url, { redirect: 'manual', cache: 'no-store', signal: combined,
        headers: { Accept: 'text/html', 'Accept-Language': 'ja', 'User-Agent': 'JevSlop/0.1 (local article quality reader)' } });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) throw new AppError('REDIRECT_FAILED', '記事の転送先を確認できませんでした。', 502);
        url = noteUrl(new URL(location, url).href);
        continue;
      }
      if (response.url) noteUrl(response.url);
      if (!response.ok) {
        await response.body?.cancel();
        throw new AppError('ARTICLE_UNAVAILABLE', `記事を取得できませんでした（HTTP ${response.status}）。URLと公開範囲を確認し、時間をおいて再試行してください。`, 422);
      }
      if (!response.headers.get('content-type')?.includes('text/html')) {
        await response.body?.cancel();
        throw new AppError('NOT_HTML', '対応する記事ページではありません。', 422);
      }
      return { url, ...extractArticle(await readLimited(response, 3 * 1024 * 1024)) };
    }
    throw new AppError('REDIRECT_FAILED', '記事の転送回数が多すぎます。元の記事URLを確認してください。', 422);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (timeout.aborted) throw new AppError('ARTICLE_TIMEOUT', 'noteからの取得が20秒以内に完了しませんでした。時間をおいて再試行してください。', 504);
    if (signal?.aborted) throw new AppError('CANCELLED', '評価を中止しました。');
    throw new AppError('ARTICLE_NETWORK', 'noteに接続できませんでした。ネットワークを確認してください。', 502);
  }
}
