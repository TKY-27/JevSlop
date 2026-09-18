import { TypeSafeClient } from '@typesafe-ai/sdk';
import { noteUrl } from '../../lib/article-url';
import { AppError } from '../../lib/errors';
import { evaluateArticle } from '../../lib/jev';
import { type Evaluation } from '../../lib/scoring';

type EdgeElement = {
  tagName: string;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  remove(): EdgeElement;
  onEndTag(handler: () => void): void;
};
type EdgeText = { text: string; removed: boolean };
type EdgeHandler = { element?(element: EdgeElement): void; text?(text: EdgeText): void };
type EdgeRewriter = { on(selector: string, handler: EdgeHandler): EdgeRewriter; transform(response: Response): Response };
declare const HTMLRewriter: { new(): EdgeRewriter };

type PagesContext = { request: Request };

const MAX_HTML_BYTES = 3 * 1024 * 1024;
const MAX_REQUEST_BYTES = 4096;
const NOTE_TIMEOUT_MS = 20_000;
const JEV_TIMEOUT_MS = 60_000;
const blockTags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'tr', 'div', 'section', 'figure', 'figcaption']);
const hiddenClasses = new Set(['toc', 'note-toc']);
const removedTags = new Set(['script', 'style', 'noscript', 'iframe', 'nav', 'aside', 'button', 'form']);

function jsonError(code: string, status: number) {
  return Response.json({ code }, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}

function classList(element: EdgeElement) {
  return new Set((element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean));
}

function parseSchema(scripts: string[]) {
  const entries = scripts.flatMap(script => {
    try {
      const value = JSON.parse(script) as Record<string, unknown>;
      return Array.isArray(value['@graph']) ? value['@graph'] : [value];
    } catch { return []; }
  });
  return entries.find(entry => entry['@type'] === 'BlogPosting' || entry['@type'] === 'Article') as Record<string, unknown> | undefined;
}

async function readLimited(response: Response, maxBytes: number) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new AppError('TOO_LARGE', '取得データが大きすぎます。', 413);
  const reader = response.body?.getReader();
  if (!reader) throw new AppError('EMPTY_RESPONSE', 'ページを取得できませんでした。', 502);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new AppError('TOO_LARGE', '取得データが大きすぎます。', 413);
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(merged);
}

async function extractArticle(html: string) {
  const bodyParts: string[] = [];
  const titleParts: string[] = [];
  const scripts: string[] = [];
  let bodyDepth = 0;
  let titleDepth = 0;
  let scriptIndex = -1;
  let bodyFound = false;
  let restricted = false;
  const transformed = new HTMLRewriter().on('*', {
    element(element) {
      const tag = element.tagName.toLowerCase();
      const classes = classList(element);
      const isBody = classes.has('note-common-styles__textnote-body');
      const isTitle = tag === 'h1' && classes.has('o-noteContentHeader__title');
      const isRestricted = classes.has('p-article__paywall') || element.getAttribute('data-name') === 'paywall' || classes.has('o-noteContentHeader__price');
      if (isRestricted) { restricted = true; element.remove(); return; }
      if (tag === 'script' && element.getAttribute('type') === 'application/ld+json') {
        scriptIndex = scripts.length; scripts.push('');
        element.onEndTag(() => { scriptIndex = -1; });
        return;
      }
      if (isBody) {
        bodyFound = true; bodyDepth += 1;
        element.onEndTag(() => { bodyParts.push('\n'); bodyDepth -= 1; });
        return;
      }
      if (isTitle) {
        titleDepth += 1;
        element.onEndTag(() => { titleDepth -= 1; });
      }
      if (bodyDepth > 0) {
        const hidden = element.hasAttribute('hidden') || element.getAttribute('aria-hidden') === 'true' || /display\s*:\s*none|visibility\s*:\s*hidden/i.test(element.getAttribute('style') ?? '');
        const embedded = element.getAttribute('embedded-service') === 'note' || element.getAttribute('embedded-service') === 'external-article';
        if (removedTags.has(tag) || hidden || embedded || [...classes].some(name => hiddenClasses.has(name))) { element.remove(); return; }
        if (tag === 'br') { bodyParts.push('\n'); return; }
        if (blockTags.has(tag)) bodyParts.push('\n');
        if (blockTags.has(tag)) element.onEndTag(() => bodyParts.push('\n'));
      }
    },
    text(text) {
      if (scriptIndex >= 0) scripts[scriptIndex] += text.text;
      if (titleDepth > 0 && !text.removed) titleParts.push(text.text);
      if (bodyDepth > 0 && !text.removed && scriptIndex < 0) bodyParts.push(text.text);
    },
  }).transform(new Response(html, { headers: { 'Content-Type': 'text/html' } }));
  await transformed.arrayBuffer();
  const schema = parseSchema(scripts);
  if (restricted || schema?.isAccessibleForFree === false || schema?.isAccessibleForFree === 'false') throw new AppError('RESTRICTED', '有料・会員限定記事は評価できません。');
  if (!bodyFound) throw new AppError('EXTRACTION_FAILED', '記事本文を抽出できませんでした。', 422);
  const body = bodyParts.join('').replace(/\r\n?/g, '\n').replace(/[\t\u00a0 ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (Array.from(body).length < 100) throw new AppError('TOO_SHORT', '評価できる本文が100文字未満です。', 422);
  const schemaTitle = typeof schema?.headline === 'string' ? schema.headline : undefined;
  const title = titleParts.join('').replace(/\s+/g, ' ').trim() || schemaTitle;
  if (!title) throw new AppError('EXTRACTION_FAILED', '記事タイトルを取得できませんでした。', 422);
  return {
    title,
    body,
    characterCount: Array.from(body).length,
    author: schema && typeof schema.author === 'object' && schema.author !== null && typeof (schema.author as { name?: unknown }).name === 'string' ? (schema.author as { name: string }).name : undefined,
    publishedAt: schema && typeof schema.datePublished === 'string' ? schema.datePublished : undefined,
    extractionMode: 'note-dom' as const,
  };
}

async function fetchArticle(input: unknown, signal: AbortSignal) {
  let url = noteUrl(input);
  const timeout = AbortSignal.timeout(NOTE_TIMEOUT_MS);
  const combined = AbortSignal.any([signal, timeout]);
  try {
    for (let hop = 0; hop < 4; hop += 1) {
      const response = await fetch(url, { redirect: 'manual', signal: combined, headers: { Accept: 'text/html', 'Accept-Language': 'ja', 'User-Agent': 'JevSlop/0.1' } });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        await response.body?.cancel();
        if (!location) throw new AppError('REDIRECT_FAILED', '記事の転送先を確認できませんでした。', 502);
        url = noteUrl(new URL(location, url).href);
        continue;
      }
      if (response.url) url = noteUrl(response.url);
      if (!response.ok) { await response.body?.cancel(); throw new AppError('ARTICLE_UNAVAILABLE', '記事を取得できませんでした。', 422); }
      if (!response.headers.get('content-type')?.includes('text/html')) { await response.body?.cancel(); throw new AppError('NOT_HTML', '対応する記事ページではありません。', 422); }
      return { url, ...(await extractArticle(await readLimited(response, MAX_HTML_BYTES))) };
    }
    throw new AppError('REDIRECT_FAILED', '記事の転送回数が多すぎます。', 422);
  } catch (error) {
    if (error instanceof AppError) throw error;
    if (timeout.aborted) throw new AppError('ARTICLE_TIMEOUT', 'noteからの取得が20秒以内に完了しませんでした。', 504);
    if (signal.aborted) throw new AppError('CANCELLED', '評価を中止しました。');
    throw new AppError('ARTICLE_NETWORK', 'noteに接続できませんでした。', 502);
  }
}

export async function onRequestPost({ request }: PagesContext) {
  const origin = request.headers.get('origin');
  if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') return jsonError('ORIGIN', 403);
  if (!request.headers.get('content-type')?.includes('application/json')) return jsonError('INPUT', 415);
  const authorization = request.headers.get('authorization') ?? '';
  if (!authorization.startsWith('Bearer ')) return jsonError('MISSING_KEY', 503);
  const apiKey = authorization.slice(7).trim();
  if (!apiKey || apiKey.length > 512 || /[\r\n]/.test(apiKey)) return jsonError('MISSING_KEY', 503);
  let input: unknown;
  const declaredRequestBytes = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredRequestBytes) && declaredRequestBytes > MAX_REQUEST_BYTES) return jsonError('INPUT', 413);
  try { input = JSON.parse(await readLimited(new Response(request.body), MAX_REQUEST_BYTES)); }
  catch (error) { return jsonError(error instanceof AppError ? error.code : 'INPUT', error instanceof AppError ? error.status : 400); }
  let url: string;
  try { url = noteUrl(input && typeof input === 'object' ? (input as { url?: unknown }).url : undefined); }
  catch (error) { return jsonError(error instanceof AppError ? error.code : 'INVALID_URL', 400); }

  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal]);
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (value: unknown) => {
        if (!signal.aborted && !closed) controller.enqueue(new TextEncoder().encode(`${JSON.stringify(value)}\n`));
      };
      const started = performance.now();
      try {
        send({ phase: 'fetching' });
        const article = await fetchArticle(url, signal);
        send({ phase: 'evaluating', characterCount: article.characterCount });
        const client = new TypeSafeClient({ apiKey, baseURL: 'https://api.typesafe.ai', logLevel: 'off', timeout: JEV_TIMEOUT_MS, retry: { maxRetries: 0 } });
        const evaluation = await evaluateArticle(article, client, signal);
        const result: Evaluation = {
          id: crypto.randomUUID(), url: article.url, title: article.title, author: article.author, publishedAt: article.publishedAt,
          characterCount: article.characterCount, extractionMode: article.extractionMode, label: '', timestamp: new Date().toISOString(),
          chunked: false, stateMode: 'title-and-body', rubricVersion: 'overall-v1-title-body', ...evaluation,
          slopScore: evaluation.overallAiSlopScore, durationMs: performance.now() - started,
          classification: evaluation.overallAiSlopLabel, classificationThreshold: null, classificationPolicy: 'jev-overall-choice-v1',
        };
        send({ phase: 'complete', result });
      } catch (error) {
        const appError = error instanceof AppError ? error : new AppError('UNEXPECTED', '処理を完了できませんでした。', 500);
        send({ phase: 'error', code: appError.code });
      } finally {
        if (!signal.aborted && !closed) { closed = true; controller.close(); }
      }
    },
    cancel() { abort.abort(); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } });
}
