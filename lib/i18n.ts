import type { AxisKey } from './scoring';

export type Language = 'ja' | 'en';

type AxisCopy = {
  name: string;
  description: string;
  direction: string;
  levels: string[];
};

export type Copy = {
  settings: string;
  settingsTitle: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  apiKeyConfigured: string;
  apiKeyMissing: string;
  language: string;
  save: string;
  deleteKey: string;
  close: string;
  settingsSaved: string;
  settingsDeleted: string;
  settingsPrivacy: string;
  settingsTransport: string;
  urlLabel: string;
  urlPlaceholder: string;
  submit: string;
  analyzing: string;
  fetching: string;
  evaluating: (characters: string) => string;
  inputDescription: string;
  cancel: string;
  cancelled: string;
  analysisDone: string;
  openSettings: string;
  resultAria: string;
  aiSlop: string;
  notAiSlop: string;
  overallVerdictNote: string;
  authorshipNote: string;
  detailsOpen: string;
  detailsClosed: string;
  detailsHeading: string;
  score: string;
  articleLength: string;
  characters: (count: string) => string;
  duration: string;
  jevDuration: string;
  evaluatedAt: string;
  classificationRule: string;
  sourceMode: string;
  fullBody: string;
  axesHeading: string;
  score100: string;
  confidence: string;
  highQuality: string;
  highSlop: string;
  axisFootnote: string;
  distribution: (axis: string) => string;
  probability: string;
  originalScore: string;
  label: string;
  labelHint: string;
  labelPlaceholder: string;
  methodSummary: string;
  methodBody: string;
  methodLimit: string;
  methodData: string;
  scoreSpecification: string;
  rawResponse: string;
  historyOpen: (count: number) => string;
  historyClose: string;
  historyHeading: string;
  export: string;
  selectNotice: string;
  sortLabel: string;
  sortNewest: string;
  sortScore: string;
  comparisonAria: string;
  articleAndLabel: string;
  classificationAndScore: string;
  processingTime: string;
  delete: string;
  deleteFromHistory: (title: string) => string;
  historyNotice: string;
  clearHistory: string;
  clearConfirm: (count: number) => string;
  clear: string;
  back: string;
  deleted: string;
  historyCleared: string;
  genericError: string;
  errors: Record<string, string>;
  axis: Record<AxisKey, AxisCopy>;
};

const japanese: Copy = {
  settings: '設定',
  settingsTitle: 'JevSlopの設定',
  apiKeyLabel: 'TypeSafe API Key',
  apiKeyPlaceholder: '入力すると現在のキーを置き換えます',
  apiKeyConfigured: 'このタブでAPIキーを設定済みです。キーそのものは表示しません。',
  apiKeyMissing: 'APIキーはまだ設定されていません。',
  language: '言語',
  save: '保存',
  deleteKey: 'APIキーを削除',
  close: '閉じる',
  settingsSaved: '設定を保存しました。',
  settingsDeleted: 'APIキーを削除しました。',
  settingsPrivacy: 'キーは画面上に再表示せず、URL・履歴・CSV/JSON出力・分析結果には含めません。',
  settingsTransport: '分析中だけブラウザから同一オリジンのCloudflare Pages Functionを経由してTypeSafe APIへ送信します。JevSlopのアプリケーションコードはキーを保存・ログ・結果や出力へ含めません。Cloudflare基盤の処理・observability metadataはCloudflareのポリシー、TypeSafe側のAPI処理はTypeSafeのポリシーに従います。',
  urlLabel: '公開note記事のURL',
  urlPlaceholder: 'noteの記事URLを入力',
  submit: '分析する',
  analyzing: '分析中',
  fetching: '記事を読み込んでいます',
  evaluating: characters => `${characters}文字を8つの詳細軸と総合判定で評価しています`,
  inputDescription: '公開されたnote記事のタイトルと本文をTypeSafeへ送信して評価します。有料・会員限定記事には対応していません。',
  cancel: '中止',
  cancelled: '評価を中止しました。送信済みのリクエストはTypeSafe側で処理される場合があります。',
  analysisDone: '評価が完了しました。比較一覧に追加しました。',
  openSettings: '設定を開く',
  resultAria: '評価結果',
  aiSlop: 'AI Slop',
  notAiSlop: 'Not AI Slop',
  overallVerdictNote: 'Jevが文章全体を読んだ総合判定です。8軸の平均ではありません。',
  authorshipNote: 'AIが書いたかどうかを判定するものではありません。',
  detailsOpen: '詳細を閉じる',
  detailsClosed: '詳細を見る',
  detailsHeading: '評価の詳細',
  score: '総合AI Slop Score',
  articleLength: '本文',
  characters: count => `${count}文字`,
  duration: '処理時間',
  jevDuration: 'Jev評価',
  evaluatedAt: '評価日時',
  classificationRule: '主判定と総合Scoreは、Jevが文章全体を読んで返した別枠のScore / choiceです。8軸の平均・重み付き合成ではありません。',
  sourceMode: 'タイトル＋本文・全文評価',
  fullBody: '全文評価',
  axesHeading: '8つの詳細軸',
  score100: 'Score / 100',
  confidence: 'Confidence',
  highQuality: '高いほど良質',
  highSlop: '高いほどSlop',
  axisFootnote: '軸を選ぶと確率分布を表示します。8軸は詳細指標で、主判定の平均には使いません。Confidenceは確率の集中度を表し、正しさを保証しません。',
  distribution: axis => `${axis}の確率分布`,
  probability: '5段階の確率',
  originalScore: '元のScore',
  label: '比較用ラベル',
  labelHint: '任意・Jevには送信されません',
  labelPlaceholder: '例：比較対象 A',
  methodSummary: '計算式・評価の限界・データの扱い',
  methodBody: '総合AI Slop Scoreと主判定は、Jevに文章全体を読ませた別枠のScore / choiceから返ります。8つのScoreは詳細指標として個別に表示し、平均・重み付き合成から主判定を作りません。',
  methodLimit: '人が書いた文章でも高く、AIを使った文章でも低くなる場合があります。Confidenceは正しさの保証ではありません。',
  methodData: 'Jevにはタイトルと本文だけを渡します。URL・著者・日時・比較ラベルは含めません。翻訳、省略、分割評価は行わず、画像・動画や埋め込み先の内容は評価対象外です。本文はサーバーや外部DBに保存せず、結果はこのタブのメモリだけに保持します。',
  scoreSpecification: 'TypeSafe Score仕様 ↗',
  rawResponse: 'Jevの応答データ',
  historyOpen: count => `比較した記事を見る（${count}件）`,
  historyClose: '比較一覧を閉じる',
  historyHeading: '記事を比較',
  export: '出力',
  selectNotice: '記事名を選ぶと、その結果を表示します。',
  sortLabel: '並び順',
  sortNewest: '評価が新しい順',
  sortScore: 'Slop Scoreが低い順',
  comparisonAria: '記事比較表（横スクロールできます）',
  articleAndLabel: '記事 / ラベル',
  classificationAndScore: '区分 / 総合Score',
  processingTime: '処理時間',
  delete: '削除',
  deleteFromHistory: title => `${title}を削除`,
  historyNotice: 'このタブ内の履歴です。再読み込みすると消えます。',
  clearHistory: '履歴をすべて削除',
  clearConfirm: count => `全${count}件を削除しますか？`,
  clear: '削除する',
  back: '戻る',
  deleted: '比較一覧から削除しました。',
  historyCleared: '比較一覧を空にしました。',
  genericError: '評価に失敗しました。時間をおいて再試行してください。',
  errors: {
    MISSING_KEY: 'TypeSafe APIキーを設定してください。',
    INVALID_URL: 'https://note.com/ユーザー名/n/記事ID 形式の公開記事URLを入力してください。',
    REDIRECT_FAILED: '記事の転送先を確認できませんでした。元の記事URLを確認してください。',
    ARTICLE_UNAVAILABLE: '記事を取得できませんでした。URLと公開範囲を確認してください。',
    NOT_HTML: '対応する記事ページではありません。公開note記事を指定してください。',
    EXTRACTION_FAILED: '記事本文を抽出できませんでした。公開範囲やnoteのページ形式を確認してください。',
    TOO_SHORT: '評価できる本文が100文字未満です。十分な本文のある記事を指定してください。',
    RESTRICTED: '有料・会員限定記事は評価できません。無料で全文公開されている記事を指定してください。',
    TOO_LARGE: '取得データが大きすぎます。より短い記事を指定してください。',
    ARTICLE_TIMEOUT: 'noteからの取得が20秒以内に完了しませんでした。時間をおいて再試行してください。',
    ARTICLE_NETWORK: 'noteに接続できませんでした。ネットワークを確認してください。',
    JEV_TIMEOUT: 'Jevの評価が60秒以内に完了しませんでした。時間をおいて再試行してください。',
    JEV_AUTH: 'TypeSafeのAPIキーが認証されませんでした。キーと利用権限を確認してください。',
    JEV_RATE_LIMIT: 'TypeSafeの利用上限に達しました。しばらく待ってから再試行してください。',
    JEV_INPUT: 'Jevが全文を受け付けませんでした。入力上限の可能性があるため、より短い記事をお試しください。本文の省略や部分評価は行いません。',
    JEV_NETWORK: 'TypeSafeに接続できませんでした。ネットワークを確認してください。',
    INVALID_JEV_RESPONSE: 'Jevの応答形式が不正なため、スコアを保存しませんでした。時間をおいて再試行してください。',
    JEV_UNAVAILABLE: 'Jevから正常な応答を得られませんでした。時間をおいて再試行してください。',
    ORIGIN: 'このページから分析を実行してください。',
    INPUT: '入力形式が正しくありません。',
    UNEXPECTED: '処理を完了できませんでした。時間をおいて再試行してください。',
    CANCELLED: '評価を中止しました。',
  },
  axis: {
    informationDensity: { name: '情報密度', description: '文章の長さに対して、実質的な情報がどれだけ含まれるか。', direction: '高いほど良質', levels: ['ほぼ埋め草', '低い', '中程度', '高い', '非常に高密度'] },
    specificity: { name: '具体性', description: '曖昧な一般論ではなく、具体的な詳細や観察があるか。', direction: '高いほど良質', levels: ['ほぼ抽象的', '主に抽象的', '混在', '主に具体的', '非常に具体的'] },
    redundancy: { name: '内容の反復', description: '新しい情報を加えず、同じ考えを繰り返しているか。', direction: '高いほどSlop', levels: ['ほぼなし', 'わずか', '目立つ', '頻繁', '非常に多い'] },
    genericness: { name: '一般論の多さ', description: '同じ話題の別の記事と入れ替えても通じる文章か。', direction: '高いほどSlop', levels: ['固有性が高い', '主に固有', '混在', '主に一般論', 'ほぼ一般論'] },
    templatePhrasing: { name: '定型的な表現', description: '予測できる決まり文句や、型どおりの接続表現の多さ。', direction: '高いほどSlop', levels: ['ほぼなし', 'ときどき', '中程度', '頻繁', '全体を占める'] },
    unnecessaryVerbosity: { name: '不要な長さ', description: '情報・論拠・証拠・語り口を失わずに削れる文章の多さ。', direction: '高いほどSlop', levels: ['ほぼなし', '少量', '中程度', '多い', '大部分を削れる'] },
    personalEvidence: { name: '一次的な根拠', description: '実体験、具体的な観察、独自の証拠や書き手固有の詳細。', direction: '高いほど良質', levels: ['なし', 'ほぼなし', '一部ある', '十分ある', '記事の中心'] },
    coherence: { name: '論旨の一貫性', description: '表面的なつなぎではなく、考えが論理的に展開されるか。', direction: '高いほど良質', levels: ['支離滅裂', '断絶が多い', '概ねつながる', '一貫している', '非常に一貫'] },
  },
};

const english: Copy = {
  settings: 'Settings',
  settingsTitle: 'JevSlop settings',
  apiKeyLabel: 'TypeSafe API Key',
  apiKeyPlaceholder: 'Enter a new key to replace the current one',
  apiKeyConfigured: 'An API key is set for this tab. The key itself is never shown again.',
  apiKeyMissing: 'No API key is configured.',
  language: 'Language',
  save: 'Save',
  deleteKey: 'Delete API key',
  close: 'Close',
  settingsSaved: 'Settings saved.',
  settingsDeleted: 'API key deleted.',
  settingsPrivacy: 'The key is never shown again and is excluded from URLs, history, CSV/JSON exports, and analysis results.',
  settingsTransport: 'During analysis the key travels from the browser through the same-origin Cloudflare Pages Function to the TypeSafe API. JevSlop application code does not store or log it, and the Function does not include it in responses or exports. Cloudflare infrastructure processing and observability metadata follow Cloudflare policies; TypeSafe API processing follows TypeSafe policies.',
  urlLabel: 'Public note article URL',
  urlPlaceholder: 'Paste a note article URL',
  submit: 'Analyze',
  analyzing: 'Analyzing',
  fetching: 'Loading the article',
  evaluating: characters => `Evaluating ${characters} characters across eight details and one overall judgment`,
  inputDescription: 'The public note article title and body are sent to TypeSafe for evaluation. Paid and members-only articles are not supported.',
  cancel: 'Cancel',
  cancelled: 'Evaluation cancelled. A request already sent may still be processed by TypeSafe.',
  analysisDone: 'Evaluation complete. Added to comparison history.',
  openSettings: 'Open Settings',
  resultAria: 'Evaluation result',
  aiSlop: 'AI Slop',
  notAiSlop: 'Not AI Slop',
  overallVerdictNote: 'This is Jev\'s whole-article judgment. It is not an average of the eight dimensions.',
  authorshipNote: 'This does not determine whether AI wrote the article.',
  detailsOpen: 'Hide details',
  detailsClosed: 'Show details',
  detailsHeading: 'Evaluation details',
  score: 'Overall AI Slop Score',
  articleLength: 'Body',
  characters: count => `${count} chars`,
  duration: 'Total time',
  jevDuration: 'Jev time',
  evaluatedAt: 'Evaluated',
  classificationRule: 'The primary label and overall score come from separate Jev Score and choice questions that read the whole article. They are not derived from an eight-dimension average or weighted sum.',
  sourceMode: 'Title + body · full text',
  fullBody: 'Full text',
  axesHeading: 'Eight detail dimensions',
  score100: 'Score / 100',
  confidence: 'Confidence',
  highQuality: 'Higher is better',
  highSlop: 'Higher is more Slop',
  axisFootnote: 'Select a dimension to inspect its probability distribution. These are detail signals, not an average used for the primary label. Confidence describes concentration, not correctness.',
  distribution: axis => `${axis} probability distribution`,
  probability: 'Probability across five levels',
  originalScore: 'Original Score',
  label: 'Comparison label',
  labelHint: 'Optional · never sent to Jev',
  labelPlaceholder: 'e.g. Control A',
  methodSummary: 'Formula, limits, and data handling',
  methodBody: 'The overall AI Slop Score and primary label come from separate Jev Score and choice questions that read the whole article. The eight Scores remain individual detail signals; the primary label is not computed from their average or weighted sum.',
  methodLimit: 'Human writing can score high, and AI-assisted writing can score low. Confidence is not a guarantee of correctness.',
  methodData: 'Jev receives only the title and body. URL, author, date, and comparison labels are excluded. Text is not translated, shortened, or chunked; images, video, and embeds are outside the evaluation. The body is not stored on the server or in an external database, and results stay in this tab memory.',
  scoreSpecification: 'TypeSafe Score specification ↗',
  rawResponse: 'Jev response data',
  historyOpen: count => `View comparison history (${count})`,
  historyClose: 'Hide comparison history',
  historyHeading: 'Compare articles',
  export: 'Export',
  selectNotice: 'Select an article title to view its result.',
  sortLabel: 'Sort',
  sortNewest: 'Newest first',
  sortScore: 'Lowest Slop Score first',
  comparisonAria: 'Article comparison table (horizontal scrolling)',
  articleAndLabel: 'Article / label',
  classificationAndScore: 'Class / Overall Score',
  processingTime: 'Time',
  delete: 'Delete',
  deleteFromHistory: title => `Delete ${title}`,
  historyNotice: 'History is kept in this tab only and disappears on reload.',
  clearHistory: 'Clear all history',
  clearConfirm: count => `Delete all ${count} results?`,
  clear: 'Delete',
  back: 'Back',
  deleted: 'Removed from comparison history.',
  historyCleared: 'Comparison history cleared.',
  genericError: 'Evaluation failed. Please try again later.',
  errors: {
    MISSING_KEY: 'Set your TypeSafe API key in Settings before analyzing.',
    INVALID_URL: 'Enter a public article URL in the form https://note.com/username/n/article-id.',
    REDIRECT_FAILED: 'The article redirect could not be verified. Check the original URL.',
    ARTICLE_UNAVAILABLE: 'The article could not be fetched. Check its URL and publication access.',
    NOT_HTML: 'This is not a supported article page. Enter a public note article.',
    EXTRACTION_FAILED: 'The article body could not be extracted. Check its access and note page format.',
    TOO_SHORT: 'The article body is under 100 characters. Try an article with more text.',
    RESTRICTED: 'Paid and members-only articles are not supported. Use a public full-text article.',
    TOO_LARGE: 'The fetched page is too large. Try a shorter article.',
    ARTICLE_TIMEOUT: 'note did not respond within 20 seconds. Please try again later.',
    ARTICLE_NETWORK: 'Could not connect to note. Check your network and try again.',
    JEV_TIMEOUT: 'Jev did not finish within 60 seconds. Please try again later.',
    JEV_AUTH: 'TypeSafe rejected the API key. Check the key and its permissions.',
    JEV_RATE_LIMIT: 'TypeSafe rate limit reached. Wait and try again.',
    JEV_INPUT: 'Jev rejected the full article, possibly due to an input limit. Try a shorter article; no partial score was produced.',
    JEV_NETWORK: 'Could not connect to TypeSafe. Check your network and try again.',
    INVALID_JEV_RESPONSE: 'Jev returned an unexpected response, so no score was saved. Please try again later.',
    JEV_UNAVAILABLE: 'Jev did not return a usable response. Please try again later.',
    ORIGIN: 'Run the analysis from this page.',
    INPUT: 'The request format is invalid.',
    UNEXPECTED: 'The evaluation could not finish. Please try again later.',
    CANCELLED: 'Evaluation cancelled.',
  },
  axis: {
    informationDensity: { name: 'Information density', description: 'Substantive information relative to the length of the writing.', direction: 'Higher is better', levels: ['Mostly filler', 'Low', 'Moderate', 'High', 'Exceptionally dense'] },
    specificity: { name: 'Specificity', description: 'Concrete details and observations rather than vague generalities.', direction: 'Higher is better', levels: ['Almost abstract', 'Mostly generic', 'Mixed', 'Mostly concrete', 'Highly concrete'] },
    redundancy: { name: 'Redundancy', description: 'Repeating the same ideas without adding useful information.', direction: 'Higher is more Slop', levels: ['Almost none', 'Minor', 'Noticeable', 'Frequent', 'Extreme'] },
    genericness: { name: 'Genericness', description: 'How interchangeable the prose is with another article on the same subject.', direction: 'Higher is more Slop', levels: ['Distinctive', 'Mostly distinctive', 'Mixed', 'Mostly generic', 'Interchangeable'] },
    templatePhrasing: { name: 'Template phrasing', description: 'Predictable stock phrases and formulaic transitions.', direction: 'Higher is more Slop', levels: ['Almost none', 'Occasional', 'Moderate', 'Frequent', 'Dominant'] },
    unnecessaryVerbosity: { name: 'Unnecessary verbosity', description: 'Text removable without losing useful information, reasoning, evidence, or voice.', direction: 'Higher is more Slop', levels: ['Almost none', 'Small amount', 'Moderate', 'Large amount', 'Most removable'] },
    personalEvidence: { name: 'Personal evidence', description: 'Firsthand experience, concrete observation, original evidence, or author-specific detail.', direction: 'Higher is better', levels: ['None', 'Very little', 'Some', 'Substantial', 'Central'] },
    coherence: { name: 'Coherence', description: 'Ideas develop logically rather than being joined by superficial transitions.', direction: 'Higher is better', levels: ['Incoherent', 'Often disconnected', 'Adequate', 'Coherent', 'Exceptionally coherent'] },
  },
};

export const translations: Record<Language, Copy> = { ja: japanese, en: english };

export function browserLanguage(): Language {
  return typeof navigator !== 'undefined' && /^en(?:-|$)/i.test(navigator.language) ? 'en' : 'ja';
}
