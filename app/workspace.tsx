'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { AXES, type AxisKey, type Evaluation } from '@/lib/scoring';
import { resultsCsv } from '@/lib/exports';

type Phase = 'idle' | 'fetching' | 'evaluating';
const fixed = (n: number) => n.toFixed(1);
const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
const seconds = (n: number) => `${(n / 1000).toFixed(2)} s`;
const time = (iso: string) => new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function Arrow({ down = false }: { down?: boolean }) {
  return <svg className={down ? 'arrow down' : 'arrow'} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

export default function Workspace({ keyConfigured }: { keyConfigured: boolean }) {
  const [url, setUrl] = useState('');
  const [history, setHistory] = useState<Evaluation[]>([]);
  const [selected, setSelected] = useState<string>();
  const [axisKey, setAxisKey] = useState<AxisKey>('informationDensity');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [characters, setCharacters] = useState(0);
  const [sort, setSort] = useState('newest');
  const [confirmClear, setConfirmClear] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const busy = phase !== 'idle';
  const result = history.find(r => r.id === selected) ?? history[0];
  const axis = AXES.find(a => a.key === axisKey)!;
  const answer = result?.answers[axisKey];
  const sorted = [...history].sort((a, b) => sort === 'score' ? a.slopScore - b.slopScore : b.timestamp.localeCompare(a.timestamp));

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
    return () => clearInterval(timer);
  }, [busy]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setError(''); setNotice(''); setShowDetails(false); setElapsed(0); setCharacters(0); setPhase('fetching');
    try {
      const response = await fetch('/api/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }), signal: controller.signal });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || '評価を開始できませんでした。'); }
      if (!response.body) throw new Error('サーバーとの接続を確認してください。');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '', completed = false;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n'); buffer = lines.pop()!;
          for (const line of lines) {
            if (!line.trim()) continue;
            const message = JSON.parse(line);
            if (message.phase === 'error') throw new Error(message.error);
            if (message.phase === 'fetching' || message.phase === 'evaluating') setPhase(message.phase);
            if (message.characterCount) setCharacters(message.characterCount);
            if (message.phase === 'complete') {
              const next = message.result as Evaluation;
              setHistory(old => [next, ...old]); setSelected(next.id); setAxisKey('informationDensity'); setShowDetails(false);
              setNotice('評価が完了しました。比較一覧に追加しました。');
              completed = true;
            }
          }
          if (done) break;
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      if (!completed) throw new Error('接続が途中で切れました。結果は保存されていません。再試行してください。');
      requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true }));
    } catch (e) {
      if (controller.signal.aborted) setNotice('評価を中止しました。送信済みのリクエストはTypeSafe側で処理される場合があります。');
      else setError(e instanceof Error ? e.message : '評価に失敗しました。再試行してください。');
    } finally { setPhase('idle'); abortRef.current = null; }
  }

  function download(format: 'csv' | 'json') {
    const content = format === 'csv' ? resultsCsv(history) : JSON.stringify({ rubricVersion: 'frozen-v1-title-body', weights: Object.fromEntries(AXES.map(a => [a.key, a.weight])), results: history }, null, 2);
    const objectUrl = URL.createObjectURL(new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' }));
    const a = document.createElement('a'); a.href = objectUrl; a.download = `jevslop-${new Date().toISOString().slice(0, 10)}.${format}`; a.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  return <main className={`workspace ${busy || result || error ? 'has-content' : ''}`}>
    <section className="search-stage" aria-label="note記事を評価">
      <div className="search-group">
        <h1 className="wordmark">JevSlop</h1>
        <form onSubmit={evaluate}>
          <label htmlFor="article-url" className="sr-only">公開記事のURL</label>
          <div className={`url-control ${busy ? 'is-busy' : ''}`}>
            <svg className="link-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m10 13 4-4m-6.5 6.5-1 1a4 4 0 0 1-5.7-5.6l4-4a4 4 0 0 1 5.7 0m3 1.6 1-1a4 4 0 0 1 5.7 5.6l-4 4a4 4 0 0 1-5.7 0" transform="translate(1 1)" /></svg>
            <input id="article-url" type="url" inputMode="url" required maxLength={2048} autoComplete="off" spellCheck={false} placeholder="noteの記事URLを入力" value={url} onChange={e => setUrl(e.target.value)} disabled={busy} aria-describedby="input-description" />
            <button className="submit-button" type="submit" disabled={busy} aria-label={busy ? '評価中' : '評価する'}><Arrow /></button>
          </div>
          <p id="input-description" className="sr-only">公開されたnote記事のタイトルと本文をTypeSafeへ送信して評価します。有料・会員限定記事には対応していません。</p>
        </form>
      </div>
      {!keyConfigured && <p className="setup-note">APIキーが未設定です。<code>.env.local</code> に <code>TYPESAFE_API_KEY</code> を設定してください。</p>}
      {error && <div className="error" role="alert"><strong>評価できませんでした</strong><p>{error}</p></div>}
      <div className="sr-only" role="status" aria-live="polite">{notice || (phase === 'fetching' ? '記事を取得しています' : phase === 'evaluating' ? '8軸を評価しています' : '')}</div>
      {busy && <div className="processing" aria-label="評価の進行状況">
        <span className="activity-line" aria-hidden="true" />
        <p>{phase === 'fetching' ? '記事を読み込んでいます' : `${characters.toLocaleString()}文字を8つの軸で評価しています`}</p>
        <span className="elapsed mono" aria-hidden="true">{elapsed.toFixed(1)}秒</span>
        <button type="button" className="quiet-button" onClick={() => abortRef.current?.abort()}>中止</button>
      </div>}
    </section>

    {result && !busy && <>
      <section className="result-summary enter" key={result.id} aria-label="評価結果" ref={resultRef} tabIndex={-1}>
        <a className="result-title" href={result.url} target="_blank" rel="noreferrer">{result.title}<span aria-hidden="true"> ↗</span></a>
        <h2 className="verdict">{result.classification}</h2>
        <p className="verdict-note">AI執筆の判定ではありません。</p>
        <button className="details-button" aria-expanded={showDetails} aria-controls="score-details" onClick={() => setShowDetails(!showDetails)}>{showDetails ? '詳細を閉じる' : '詳細を見る'}<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={showDetails ? 'chevron open' : 'chevron'} aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg></button>
      </section>

      {showDetails && <section id="score-details" className="score-details enter" aria-labelledby="detail-heading">
        <div className="detail-heading"><h2 id="detail-heading">評価の詳細</h2><span>{result.model}</span></div>
        <div className="score-overview"><div><span className="overline">Slop Score</span><p className="score-value"><strong>{fixed(result.slopScore)}</strong><span>/ 100</span></p></div>
          <dl className="run-info"><div><dt>本文</dt><dd>{result.characterCount.toLocaleString()}文字</dd></div><div><dt>処理時間</dt><dd>{seconds(result.durationMs)}</dd></div><div><dt>Jev評価</dt><dd>{seconds(result.jevDurationMs)}</dd></div><div><dt>評価日時</dt><dd>{time(result.timestamp)}</dd></div></dl>
        </div>
        <p className="classification-rule">丸め前のSlop Scoreが50以上で「AI Slop」、50未満で「Not AI Slop」。境界は表示のための仮の基準で、実証済みの判定基準ではありません。{Math.abs(result.slopScore - 50) < 0.05 && <> この結果の丸め前の値は{result.slopScore.toPrecision(8)}です。</>}</p>
        <div className="source-meta"><a href={result.url} target="_blank" rel="noreferrer">{result.url}</a>{result.author && <span>{result.author}</span>}<span>タイトル＋本文・全文評価</span></div>
        <div className="axis-list"><div className="axis-list-heading"><span>8つの評価軸</span><span>Score / 100</span><span>Confidence</span></div>
          {AXES.map((a, index) => <button key={a.key} type="button" className={`axis-row ${axisKey === a.key ? 'active' : ''}`} onClick={() => setAxisKey(a.key)} aria-pressed={axisKey === a.key} style={{ '--delay': `${index * 25}ms` } as CSSProperties}>
            <span className="axis-name">{a.label}<small>{a.positive ? '高いほど良質' : '高いほどSlop'}</small></span>
            <span className="axis-score"><span className="mini-bar" aria-hidden="true"><i style={{ transform: `scaleX(${result.scores[a.key] / 100})` }} /></span>{fixed(result.scores[a.key])}</span>
            <span className="confidence">{percent(result.answers[a.key].confidence)}<span aria-hidden="true"> ›</span></span>
          </button>)}
        </div>
        <p className="axis-footnote">軸を選ぶと確率分布を表示します。Confidenceは確率の集中度を表し、正しさを保証しません。</p>
        {answer && <div className="distribution" key={`${result.id}-${axisKey}`}>
          <div className="distribution-heading"><div><h3>{axis.label}の確率分布</h3><p>{axis.description}</p></div><span className="metric-key mono">{axisKey}</span></div>
          <div className="probability-chart" aria-label={`${axis.label}の5段階の確率`}>
            {axis.levelLabels.map((label, i) => <div className="probability-column" key={i}><span className="probability-number">{percent(answer.probabilities[i])}</span><div className="probability-track" aria-hidden="true"><div className="probability-bar" style={{ '--probability': answer.probabilities[i], '--delay': `${i * 40}ms` } as CSSProperties} /></div><span className="level-index">L{i + 1}</span><span className="level-label">{label}</span></div>)}
          </div>
          <div className="distribution-stats"><span>元のScore <b>{answer.score.toFixed(3)} / 4</b></span><span>Confidence <b>{percent(answer.confidence)}</b></span><span>総合への寄与 <b>{fixed((axis.positive ? 100 - result.scores[axisKey] : result.scores[axisKey]) * axis.weight)}点</b></span><span>重み <b>{axis.weight * 100}%{axis.positive ? '（反転）' : ''}</b></span></div>
        </div>}
        <div className="label-section"><label htmlFor="result-label">比較用ラベル <span>任意・Jevには送信されません</span></label><input id="result-label" maxLength={80} placeholder="例：比較対象 A" value={result.label} onChange={e => { const label = e.target.value; setHistory(old => old.map(r => r.id === result.id ? { ...r, label } : r)); }} /></div>
        <details className="plain-details"><summary>計算式・評価の限界・データの扱い</summary><div className="method-body"><p>各Score（0–4）を25倍し、良質さの軸は100から引いて、以下の固定重みで合計します。二択ラベルもコードで計算し、JevにAI執筆かどうかを質問しません。</p><ul className="weight-list">{AXES.map(a => <li key={a.key}><span>{a.label}{a.positive ? '（反転）' : ''}</span><span>{a.weight * 100}%</span></li>)}</ul><p>人が書いた文章でも高く、AIを使った文章でも低くなる場合があります。日本語での評価精度は英語と同等ではありません。低いConfidenceの結果も除外せず表示します。</p><p>Jevにはタイトルと本文だけを渡します。URL・著者・日時・比較ラベルは含めません。翻訳、省略、分割評価は行わず、画像・動画や埋め込み先の内容は評価対象外です。</p><p>本文はサーバーファイル・ブラウザ履歴・外部DBには保存しません。結果はタブ内のメモリだけに保持します。再読み込みする前に必要な結果を書き出してください。</p><a href="https://docs.typesafe.ai/primitives/score" target="_blank" rel="noreferrer">TypeSafeのScore仕様 ↗</a></div></details>
        <details className="plain-details"><summary>Jevの応答データ</summary><pre>{JSON.stringify({ model: result.model, answers: result.answers, usage: result.usage, requestId: result.requestId }, null, 2)}</pre></details>
      </section>}
    </>}

    {history.length > 0 && <section className="history-section">
      <button className="history-toggle" aria-expanded={showHistory} aria-controls="comparison" onClick={() => setShowHistory(!showHistory)}>{showHistory ? '比較一覧を閉じる' : `比較した記事を見る（${history.length}件）`}</button>
      {showHistory && <div id="comparison" className="comparison enter">
        <div className="comparison-heading"><h2>記事を比較</h2><div className="export-actions"><button onClick={() => download('csv')}>CSV <Arrow down /></button><button onClick={() => download('json')}>JSON <Arrow down /></button></div></div>
        <div className="table-toolbar"><p>記事名を選ぶと、その結果を表示します。</p><label htmlFor="sort">並び順 <select id="sort" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">評価が新しい順</option><option value="score">Slop Scoreが低い順</option></select></label></div>
        <div className="table-scroll" role="region" aria-label="記事比較表（横スクロールできます）" tabIndex={0}><table><thead><tr><th scope="col" className="title-col">記事 / ラベル</th><th scope="col">区分 / Slop Score</th>{AXES.map(a => <th scope="col" key={a.key}>{a.label}<small>{a.positive ? '高いほど良質' : '高いほどSlop'}<br />数値 / Conf.</small></th>)}<th scope="col">処理時間</th><th scope="col"><span className="sr-only">操作</span></th></tr></thead><tbody>{sorted.map(r => <tr key={r.id} className={r.id === result?.id ? 'selected-row' : ''}><th scope="row" className="title-col"><button className="table-title" onClick={() => { setSelected(r.id); setShowDetails(false); setAxisKey('informationDensity'); resultRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }); requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true })); }} aria-current={r.id === result?.id ? 'true' : undefined}>{r.title}</button><a className="table-url" href={r.url} target="_blank" rel="noreferrer">{r.url}</a>{r.label && <span className="table-label">{r.label}</span>}</th><td className="table-slop">{fixed(r.slopScore)}<small>{r.classification}</small></td>{AXES.map(a => <td key={a.key}>{fixed(r.scores[a.key])}<small>{percent(r.answers[a.key].confidence)}</small></td>)}<td>{seconds(r.durationMs)}</td><td><button className="delete-button" aria-label={`${r.title}を削除`} onClick={() => { setHistory(old => old.filter(item => item.id !== r.id)); setNotice('比較一覧から削除しました。'); }}>削除</button></td></tr>)}</tbody></table></div>
        <div className="history-footer"><p>このタブ内の履歴です。再読み込みすると消えます。</p>{confirmClear ? <div className="clear-confirm"><span>全{history.length}件を削除しますか？</span><button className="danger-button" onClick={() => { setHistory([]); setSelected(undefined); setShowDetails(false); setShowHistory(false); setConfirmClear(false); setNotice('比較一覧を空にしました。'); }}>削除する</button><button onClick={() => setConfirmClear(false)}>戻る</button></div> : <button className="quiet-button" onClick={() => setConfirmClear(true)}>履歴をすべて削除</button>}</div>
      </div>}
    </section>}
  </main>;
}
