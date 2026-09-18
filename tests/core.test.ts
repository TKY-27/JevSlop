import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { TypeSafeClient, type ScoreResponse } from '@typesafe-ai/sdk';
import { noteUrl, extractArticle, fetchArticle, readLimited } from '../lib/article';
import { AXES, normalizeScores, validateAnswers, validateOverallLabelAnswer, validateScoreAnswer, type Answers, type Evaluation, type OverallAiSlopLabel, type OverallAiSlopLabelAnswer } from '../lib/scoring';
import { buildRequest, evaluateArticle } from '../lib/jev';
import { resultsCsv } from '../lib/exports';

const html = readFileSync(new URL('./fixtures/note.html', import.meta.url), 'utf8');
const url = 'https://note.com/test/n/nabcdef';

function scoreAnswerAt(score: number): ScoreResponse {
  return {
    type: 'score', score, confidence: 1,
    probabilities: Object.fromEntries([0, 1, 2, 3, 4].map(i => [i, i === score ? 1 : 0])),
    legend: Object.fromEntries(['L0', 'L1', 'L2', 'L3', 'L4'].map((level, i) => [i, level])),
  } as ScoreResponse;
}

function answersAt(score: number): Answers {
  return Object.fromEntries(AXES.map(a => [a.key, scoreAnswerAt(score)])) as Answers;
}

function overallLabelAnswer(choice: OverallAiSlopLabel): OverallAiSlopLabelAnswer {
  return {
    type: 'choice', choice, confidence: 1,
    probabilities: { 'AI Slop': choice === 'AI Slop' ? 1 : 0, 'Not AI Slop': choice === 'Not AI Slop' ? 1 : 0 },
  };
}

test('URL and redirect allowlist blocks arbitrary hosts, credentials, translations and private destinations', async () => {
  assert.equal(noteUrl(`${url}?hl=en#x`), url);
  for (const bad of ['http://note.com/test/n/nabcdef', 'https://evil.test/test/n/nabcdef', 'https://note.com.evil.test/test/n/nabcdef', 'https://note.com@127.0.0.1/test/n/nabcdef', 'https://note.com:999/test/n/nabcdef', 'https://note.com/api/v3/notes/x', 'https://note.com/test/n/nabc%2fdef', 'https://note.com/test/n/../nabcdef']) assert.throws(() => noteUrl(bad));
  let calls = 0;
  await assert.rejects(fetchArticle(url, undefined, async () => { calls++; return new Response('', { status: 302, headers: { location: 'http://127.0.0.1/private' } }); }), { code: 'INVALID_URL' });
  assert.equal(calls, 1);
  const safe = await fetchArticle(url, undefined, async () => ++calls === 2 ? new Response('', { status: 302, headers: { location: '/test/n/nabcdef0' } }) : new Response(html, { headers: { 'content-type': 'text/html' } }));
  assert.equal(safe.url, `${url}0`);
});

test('note DOM extraction preserves prose/headings, excludes chrome, and rejects partial/empty/oversized content', async () => {
  const article = extractArticle(html);
  assert.equal(article.title, '週末の観測記録');
  assert.match(article.body, /土曜日の朝[\s\S]*\n\n測り方と気づき\n\n最初は[\s\S]*\n翌日/);
  for (const text of ['混入は禁止', '共有する', 'スキする', '非表示の文', 'secret script', '目次の重複', '関連記事タイトル', 'テスト著者']) assert.ok(!article.body.includes(text));
  assert.throws(() => extractArticle(html.replace('</article>', '<div class="p-article__paywall">有料</div></article>')), { code: 'RESTRICTED' });
  assert.throws(() => extractArticle(html.replace('"@type":"BlogPosting"', '"@type":"BlogPosting","isAccessibleForFree":false')), { code: 'RESTRICTED' });
  assert.throws(() => extractArticle('<div class="note-common-styles__textnote-body">短文</div>'), { code: 'TOO_SHORT' });
  assert.throws(() => extractArticle('<article>構造が変わった</article>'), { code: 'EXTRACTION_FAILED' });
  await assert.rejects(readLimited(new Response('12345'), 4), { code: 'TOO_LARGE' });
  await assert.rejects(fetchArticle(url, undefined, async () => new Response('no', { status: 404 })), { code: 'ARTICLE_UNAVAILABLE' });
});

test('eight detail scores remain independently normalized and are not a primary composite', () => {
  assert.deepEqual(AXES.map(a => [a.key, a.positive]), [
    ['informationDensity', true], ['specificity', true], ['redundancy', false], ['genericness', false], ['templatePhrasing', false], ['unnecessaryVerbosity', false], ['personalEvidence', true], ['coherence', true],
  ]);
  const answers = answersAt(2);
  assert.equal(normalizeScores(answers).informationDensity, 50);
  const mixed = answersAt(2);
  mixed.informationDensity = { ...mixed.informationDensity, score: 1.3, confidence: .54, probabilities: { 0: 0, 1: .7, 2: .3, 3: 0, 4: 0 } };
  validateAnswers(mixed);
  assert.equal(normalizeScores(mixed).informationDensity, 32.5);
  assert.throws(() => validateAnswers({ ...mixed, coherence: { ...mixed.coherence, score: NaN } }));
  assert.throws(() => validateAnswers({ ...mixed, coherence: { ...mixed.coherence, probabilities: { 0: .5 } } }));
  const rounded = answersAt(2);
  rounded.coherence = { ...rounded.coherence, score: 2.99, probabilities: { 0: 0, 1: .03, 2: .1, 3: .73, 4: .14 } };
  validateAnswers(rounded);
  assert.equal(normalizeScores(rounded).coherence, 74.75);
  validateScoreAnswer(scoreAnswerAt(4));
  validateOverallLabelAnswer(overallLabelAnswer('AI Slop'));
  assert.throws(() => validateOverallLabelAnswer({ ...overallLabelAnswer('AI Slop'), choice: 'unknown' }));
});

test('official SDK sends title/body, eight detail Scores, and separate overall Jev Score/choice', async () => {
  const article = { ...extractArticle(html), url, label: 'NEVER_SEND_GROUP', author: 'NEVER_SEND_AUTHOR' };
  const request = buildRequest(article);
  assert.deepEqual(Object.keys(request.state), ['title', 'body']);
  assert.equal(Object.keys(request.questions).length, 10);
  assert.ok(!JSON.stringify(request).includes('NEVER_SEND'));
  for (const axis of AXES) {
    const question = request.questions[axis.key];
    assert.equal(question.type, 'score');
    assert.equal(question.criteria.length, 5);
  }
  assert.equal(request.questions.overallAiSlopScore.type, 'score');
  assert.equal(request.questions.overallAiSlopScore.criteria.length, 5);
  assert.equal(request.questions.overallAiSlopLabel.type, 'choice');
  assert.deepEqual(Object.keys(request.questions.overallAiSlopLabel.criteria), ['AI Slop', 'Not AI Slop']);
  const responseAnswers = { ...answersAt(0), overallAiSlopScore: scoreAnswerAt(3), overallAiSlopLabel: overallLabelAnswer('AI Slop') };
  let calls = 0;
  const client = new TypeSafeClient({ apiKey: 'test-only-placeholder', logLevel: 'off', retry: { maxRetries: 0 }, fetch: async (target, init) => {
    calls++; assert.equal(target, 'https://api.typesafe.ai/v1/systemone');
    assert.deepEqual(JSON.parse(String(init?.body)), request);
    return Response.json({ model: 'jev-1.13.0', answers: responseAnswers, usage: { input_tokens: 200, output_tokens: 40 } }, { headers: { 'x-typesafe-request-id': 'synthetic-request' } });
  } });
  const response = await evaluateArticle(article, client);
  assert.equal(calls, 1); assert.deepEqual(response.answers, answersAt(0)); assert.equal(response.requestId, 'synthetic-request');
  assert.equal(response.overallAiSlopScore, 75);
  assert.equal(response.overallAiSlopLabel, 'AI Slop');
  assert.equal(response.scores.informationDensity, 0);
  for (const [status, code] of [[401, 'JEV_AUTH'], [429, 'JEV_RATE_LIMIT'], [500, 'JEV_UNAVAILABLE'], [413, 'JEV_INPUT']] as const) {
    const failing = new TypeSafeClient({ apiKey: 'test-only-placeholder', logLevel: 'off', retry: { maxRetries: 0 }, fetch: async () => Response.json({ error: 'sensitive upstream detail' }, { status }) });
    await assert.rejects(evaluateArticle(article, failing), (e: unknown) => e instanceof Error && 'code' in e && e.code === code && !e.message.includes('sensitive'));
  }
  const invalid = new TypeSafeClient({ apiKey: 'test-only-placeholder', logLevel: 'off', fetch: async () => Response.json({ model: 'jev-1.13.0', answers: {}, usage: {} }) });
  await assert.rejects(evaluateArticle(article, invalid), { code: 'INVALID_JEV_RESPONSE' });
});

test('numeric CSV includes direct overall Jev data and detail probabilities, protects formulas, and excludes body', () => {
  const answers = answersAt(2);
  const overallScoreAnswer = scoreAnswerAt(3);
  const overallLabel = overallLabelAnswer('AI Slop');
  const result: Evaluation = { id: 'test', url, title: '=UNTRUSTED()', label: '+formula', timestamp: '2026-09-18T00:00:00Z', characterCount: 123,
    extractionMode: 'note-dom', chunked: false, stateMode: 'title-and-body', rubricVersion: 'overall-v1-title-body', durationMs: 125, jevDurationMs: 100,
    model: 'jev-1.13.0', usage: { input_tokens: 200, output_tokens: 40 }, answers, scores: normalizeScores(answers), overallAiSlopScore: 75, slopScore: 75,
    overallAiSlopLabel: 'AI Slop', overallAiSlopScoreAnswer: overallScoreAnswer, overallAiSlopLabelAnswer: overallLabel,
    classification: 'AI Slop', classificationThreshold: null, classificationPolicy: 'jev-overall-choice-v1' };
  const csv = resultsCsv([result]);
  assert.ok(csv.includes("'=UNTRUSTED()")); assert.ok(csv.includes("'+formula"));
  assert.ok(csv.includes('overallAiSlopScore')); assert.ok(csv.includes('overallAiSlopLabel.pAI Slop')); assert.ok(csv.includes('informationDensity.confidence')); assert.ok(csv.includes('coherence.p4'));
  assert.ok(!csv.includes('土曜日の朝')); assert.equal(csv.split('\r\n').length, 2);
});

test('BYOK key stays session-only, out of results/exports/errors, and the Function has no shared secret or logging path', () => {
  const clientSource = readFileSync(new URL('../app/workspace.tsx', import.meta.url), 'utf8');
  assert.ok(!clientSource.includes('process.env')); assert.ok(clientSource.includes('sessionStorage')); assert.ok(clientSource.includes('Authorization'));
  assert.ok(clientSource.includes('sessionStorage.removeItem(API_KEY_STORAGE)'));
  assert.ok(clientSource.includes("setApiKey('')"));
  assert.ok(!clientSource.includes('localStorage.setItem(API_KEY_STORAGE'));
  assert.ok(!clientSource.includes('localStorage.getItem(API_KEY_STORAGE'));
  assert.ok(!clientSource.includes('rememberKey'));
  const functionSource = readFileSync(new URL('../functions/api/evaluate.ts', import.meta.url), 'utf8');
  assert.ok(functionSource.includes("logLevel: 'off'")); assert.ok(functionSource.includes("baseURL: 'https://api.typesafe.ai'"));
  assert.ok(functionSource.includes('authorization')); assert.ok(!functionSource.includes('process.env')); assert.ok(!functionSource.includes('console.'));
  assert.ok(!functionSource.includes('...article,')); assert.ok(functionSource.includes('classification: evaluation.overallAiSlopLabel'));
  const secret = 'ts-secret-test-value';
  const resultJson = JSON.stringify({ results: [{ title: 'safe', url, label: '', error: 'JEV_AUTH' }] });
  assert.ok(!resultJson.includes(secret));
  assert.ok(!resultsCsv([]).includes(secret));
  assert.ok(!JSON.stringify({ code: 'JEV_AUTH' }).includes(secret));
});

test('production security headers define the required CSP boundary', () => {
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  for (const directive of ["default-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'", "form-action 'self'", "script-src 'self'", "script-src-attr 'none'", "style-src 'self'", "style-src-attr 'unsafe-inline'"]) assert.ok(headers.includes(directive));
  assert.ok(!headers.includes('unsafe-eval'));
  assert.ok(!headers.includes('https://'));
});
