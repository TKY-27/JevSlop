import { AXES, type Evaluation } from './scoring';

function csvCell(value: unknown) {
  let text = String(value ?? '');
  // Spreadsheet programs may execute formulas even in quoted cells.
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function resultsCsv(results: Evaluation[]) {
  const headers = ['id', 'title', 'url', 'label', 'author', 'publishedAt', 'timestamp', 'overallAiSlopScore', 'slopScore', 'overallAiSlopLabel', 'classification', 'classificationThreshold', 'classificationPolicy', 'characterCount', 'durationMs', 'jevDurationMs', 'model', 'extractionMode', 'chunked', 'stateMode', 'rubricVersion', 'requestId', 'inputTokens', 'outputTokens', 'overallAiSlopScore.rawScore', 'overallAiSlopScore.confidence', ...[0, 1, 2, 3, 4].map(i => `overallAiSlopScore.p${i}`), 'overallAiSlopLabel.confidence', 'overallAiSlopLabel.pAI Slop', 'overallAiSlopLabel.pNot AI Slop',
    ...AXES.flatMap(a => [a.key, `${a.key}.rawScore`, `${a.key}.confidence`, ...a.levels.map((_, i) => `${a.key}.p${i}`)])];
  const rows = results.map(r => [r.id, r.title, r.url, r.label, r.author, r.publishedAt, r.timestamp, r.overallAiSlopScore, r.slopScore, r.overallAiSlopLabel, r.classification, r.classificationThreshold, r.classificationPolicy, r.characterCount, r.durationMs, r.jevDurationMs, r.model, r.extractionMode, r.chunked, r.stateMode, r.rubricVersion, r.requestId, r.usage.input_tokens, r.usage.output_tokens, r.overallAiSlopScoreAnswer.score, r.overallAiSlopScoreAnswer.confidence, ...[0, 1, 2, 3, 4].map(i => r.overallAiSlopScoreAnswer.probabilities[i]), r.overallAiSlopLabelAnswer.confidence, r.overallAiSlopLabelAnswer.probabilities['AI Slop'], r.overallAiSlopLabelAnswer.probabilities['Not AI Slop'],
    ...AXES.flatMap(a => [r.scores[a.key], r.answers[a.key].score, r.answers[a.key].confidence, ...a.levels.map((_, i) => r.answers[a.key].probabilities[i])])]);
  return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}
