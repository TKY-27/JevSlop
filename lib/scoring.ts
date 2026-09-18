import type { ScoreResponse, Usage } from '@typesafe-ai/sdk';

// Frozen SPEC.md order, rubric semantics and weights. SDK levels are zero-based.
export const AXES = [
  { key: 'informationDensity', label: '情報密度', weight: 0.2, positive: true,
    description: '文章の長さに対して、実質的な情報がどれだけ含まれるか。',
    question: 'How much substantive information does the article contain relative to its length?',
    levels: ['Very little substantive information; mostly filler.', 'Low information density.', 'Moderate information density.', 'High information density.', 'Exceptionally dense while still readable.'],
    levelLabels: ['ほぼ埋め草', '低い', '中程度', '高い', '非常に高密度'] },
  { key: 'specificity', label: '具体性', weight: 0.15, positive: true,
    description: '曖昧な一般論ではなく、具体的な詳細や観察があるか。',
    question: 'How specific and concrete are the details in the article, rather than vague generalities?',
    levels: ['Almost entirely vague or generic.', 'Mostly generic.', 'Mixed.', 'Mostly specific and concrete.', 'Highly specific, with concrete details or observations.'],
    levelLabels: ['ほぼ抽象的', '主に抽象的', '混在', '主に具体的', '非常に具体的'] },
  { key: 'redundancy', label: '内容の反復', weight: 0.15, positive: false,
    description: '新しい情報を加えず、同じ考えを繰り返しているか。',
    question: 'How much does the article repeat the same ideas without adding useful information?',
    levels: ['Almost no unnecessary repetition.', 'Minor repetition.', 'Some noticeable repetition.', 'Frequent repetition.', 'Extremely repetitive.'],
    levelLabels: ['ほぼなし', 'わずか', '目立つ', '頻繁', '非常に多い'] },
  { key: 'genericness', label: '一般論の多さ', weight: 0.15, positive: false,
    description: '同じ話題の別の記事と入れ替えても通じる文章か。',
    question: 'How interchangeable is the prose with generic writing on the same subject?',
    levels: ['Highly distinctive to this author and subject.', 'Mostly distinctive.', 'Mixed.', 'Mostly generic.', 'Extremely generic and interchangeable.'],
    levelLabels: ['固有性が高い', '主に固有', '混在', '主に一般論', 'ほぼ一般論'] },
  { key: 'templatePhrasing', label: '定型的な表現', weight: 0.15, positive: false,
    description: '予測できる決まり文句や、型どおりの接続表現の多さ。',
    question: 'How much formulaic, predictable, stock phrasing or transitions does the article use?',
    levels: ['Almost none.', 'Occasional.', 'Moderate.', 'Frequent.', 'Dominates the writing.'],
    levelLabels: ['ほぼなし', 'ときどき', '中程度', '頻繁', '全体を占める'] },
  { key: 'unnecessaryVerbosity', label: '不要な長さ', weight: 0.1, positive: false,
    description: '情報・論拠・証拠・語り口を失わずに削れる文章の多さ。',
    question: 'How much text could be removed without losing useful information, reasoning, evidence, or voice?',
    levels: ['Almost none.', 'A small amount.', 'A moderate amount.', 'A large amount.', 'Most of the article could be substantially compressed.'],
    levelLabels: ['ほぼなし', '少量', '中程度', '多い', '大部分を削れる'] },
  { key: 'personalEvidence', label: '一次的な根拠', weight: 0.05, positive: true,
    description: '実体験、具体的な観察、独自の証拠や書き手固有の詳細。',
    question: 'How much firsthand experience, concrete observation, original evidence, or author-specific detail is present in the article?',
    levels: ['None.', 'Very little.', 'Some.', 'Substantial.', 'Central to the article.'],
    levelLabels: ['なし', 'ほぼなし', '一部ある', '十分ある', '記事の中心'] },
  { key: 'coherence', label: '論旨の一貫性', weight: 0.05, positive: true,
    description: '表面的なつなぎではなく、考えが論理的に展開されるか。',
    question: 'How logically do ideas develop in the article, rather than being connected by superficial transitions?',
    levels: ['Highly incoherent.', 'Often disconnected.', 'Adequate.', 'Coherent.', 'Exceptionally coherent.'],
    levelLabels: ['支離滅裂', '断絶が多い', '概ねつながる', '一貫している', '非常に一貫'] },
] as const;

export type AxisKey = typeof AXES[number]['key'];
export const SLOP_THRESHOLD = 50;
export function slopLabel(value: number): 'AI Slop' | 'Not AI Slop' {
  return value >= SLOP_THRESHOLD ? 'AI Slop' : 'Not AI Slop';
}
export type Answers = Record<AxisKey, ScoreResponse>;
export type Evaluation = {
  id: string; url: string; title: string; author?: string; publishedAt?: string;
  label: string; timestamp: string; characterCount: number;
  extractionMode: 'note-dom'; chunked: false; stateMode: 'title-and-body';
  durationMs: number; jevDurationMs: number; model: string; usage: Usage;
  answers: Answers; scores: Record<AxisKey, number>; slopScore: number;
  rubricVersion: 'frozen-v1-title-body'; requestId?: string;
  classification: 'AI Slop' | 'Not AI Slop'; classificationThreshold: 50;
  classificationPolicy: 'midpoint-v1';
};

export function composite(answers: Answers) {
  const scores = Object.fromEntries(AXES.map(({ key }) => [key, answers[key].score * 25])) as Record<AxisKey, number>;
  const slopScore = AXES.reduce((sum, axis) => sum + axis.weight * (axis.positive ? 100 - scores[axis.key] : scores[axis.key]), 0);
  return { scores, slopScore };
}

export function validateAnswers(value: unknown): asserts value is Answers {
  if (!value || typeof value !== 'object') throw new Error('Invalid answers');
  for (const { key } of AXES) {
    const a = (value as Answers)[key];
    if (!a || a.type !== 'score' || !Number.isFinite(a.score) || a.score < 0 || a.score > 4 ||
        !Number.isFinite(a.confidence) || a.confidence < 0 || a.confidence > 1 || !a.probabilities || !a.legend ||
        Object.keys(a.probabilities).length !== 5 || Object.keys(a.legend).length !== 5) throw new Error('Invalid score');
    let sum = 0, expectation = 0;
    for (let i = 0; i < 5; i++) {
      const p = a.probabilities[i];
      if (!Number.isFinite(p) || p < 0 || p > 1 || typeof a.legend[i] !== 'string') throw new Error('Invalid distribution');
      sum += p; expectation += i * p;
    }
    // Jev's wire values are independently rounded to 2 decimals. Five probability
    // errors total at most 5*.005; the weighted mean plus score at most (0+1+2+3+4+1)*.005.
    // Keep the reported score and probabilities intact, never renormalize them.
    const rounding = 0.005;
    if (Math.abs(sum - 1) > 5 * rounding + 1e-9 || Math.abs(expectation - a.score) > 11 * rounding + 1e-9) {
      throw new Error('Inconsistent distribution');
    }
  }
}
