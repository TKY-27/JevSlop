import 'server-only';
import { TypeSafeClient } from '@typesafe-ai/sdk';
import { fetchArticle, noteUrl, readLimited } from '@/lib/article';
import { evaluateArticle } from '@/lib/jev';
import { composite, slopLabel, SLOP_THRESHOLD, type Evaluation } from '@/lib/scoring';
import { AppError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let url: string;
  try {
    const host = request.headers.get('host') ?? '';
    const origin = request.headers.get('origin');
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) || (origin && origin !== `http://${host}`) || request.headers.get('sec-fetch-site') === 'cross-site') {
      throw new AppError('ORIGIN', 'ローカルのJevSlop画面から評価してください。', 403);
    }
    if (!request.headers.get('content-type')?.includes('application/json')) throw new AppError('INPUT', '入力形式が正しくありません。', 415);
    let input;
    try { input = JSON.parse(await readLimited(new Response(request.body), 4096)); }
    catch (error) { if (error instanceof AppError) throw error; throw new AppError('INPUT', '入力形式が正しくありません。'); }
    url = noteUrl(input?.url);
    if (!process.env.TYPESAFE_API_KEY?.trim()) throw new AppError('MISSING_KEY', 'サーバーの .env.local に TYPESAFE_API_KEY を設定してください。', 503);
  } catch (error) {
    const e = error instanceof AppError ? error : new AppError('INPUT', '入力を確認してください。');
    return Response.json({ error: e.message, code: e.code }, { status: e.status });
  }

  const abort = new AbortController();
  const signal = AbortSignal.any([request.signal, abort.signal]);
  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: unknown) => { if (!signal.aborted) controller.enqueue(new TextEncoder().encode(JSON.stringify(value) + '\n')); };
      const started = performance.now();
      try {
        send({ phase: 'fetching' });
        const article = await fetchArticle(url, signal);
        send({ phase: 'evaluating', characterCount: article.characterCount });
        const client = new TypeSafeClient({ apiKey: process.env.TYPESAFE_API_KEY,
          baseURL: 'https://api.typesafe.ai', logLevel: 'off', timeout: 60_000, retry: { maxRetries: 0 } });
        const evaluation = await evaluateArticle(article, client, signal);
        const scores = composite(evaluation.answers);
        const result: Evaluation = {
          id: crypto.randomUUID(), url: article.url, title: article.title, author: article.author, publishedAt: article.publishedAt,
          characterCount: article.characterCount, extractionMode: article.extractionMode,
          label: '', timestamp: new Date().toISOString(), chunked: false, stateMode: 'title-and-body', rubricVersion: 'frozen-v1-title-body',
          ...evaluation, ...scores, durationMs: performance.now() - started,
          classification: slopLabel(scores.slopScore), classificationThreshold: SLOP_THRESHOLD,
          classificationPolicy: 'midpoint-v1',
        };
        send({ phase: 'complete', result });
      } catch (error) {
        const e = error instanceof AppError ? error : new AppError('UNEXPECTED', '処理を完了できませんでした。時間をおいて再試行してください。', 500);
        send({ phase: 'error', error: e.message, code: e.code });
      } finally { if (!signal.aborted) controller.close(); }
    },
    cancel() { abort.abort(); },
  });
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
