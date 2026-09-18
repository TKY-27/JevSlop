'use client';

import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import Image from 'next/image';
import { AXES, type AxisKey, type Evaluation } from '@/lib/scoring';
import { resultsCsv } from '@/lib/exports';
import { browserLanguage, translations, type Language } from '@/lib/i18n';

type Phase = 'idle' | 'fetching' | 'evaluating';
const API_KEY_STORAGE = 'jevslop:typesafe-api-key';
const LANGUAGE_STORAGE = 'jevslop:language';
const fixed = (n: number) => n.toFixed(1);
const percent = (n: number) => `${(n * 100).toFixed(1)}%`;
const seconds = (n: number) => `${(n / 1000).toFixed(2)} s`;

function formatTime(iso: string, language: Language) {
  return new Date(iso).toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Arrow({ down = false }: { down?: boolean }) {
  return <svg className={down ? 'arrow down' : 'arrow'} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

function SettingsIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 8.2a3.8 3.8 0 1 0 0 7.6 3.8 3.8 0 0 0 0-7.6Z" /><path d="m19.4 15 .1.1a1.7 1.7 0 0 1-2.4 2.4l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a1.7 1.7 0 0 1-3.4 0v-.2a1.7 1.7 0 0 0-2.9-1.2l-.1.1a1.7 1.7 0 1 1-2.4-2.4l.1-.1A1.7 1.7 0 0 0 6.2 12a1.7 1.7 0 0 0-1.2-2.9h-.2a1.7 1.7 0 0 1 0-3.4H5A1.7 1.7 0 0 0 6.2 3l-.1-.1a1.7 1.7 0 1 1 2.4-2.4l.1.1A1.7 1.7 0 0 0 11.5-.6v-.2a1.7 1.7 0 0 1 3.4 0v.2A1.7 1.7 0 0 0 17.8.6l.1-.1a1.7 1.7 0 1 1 2.4 2.4l-.1.1A1.7 1.7 0 0 0 19 5.9v.2a1.7 1.7 0 0 1 0 3.4h-.2a1.7 1.7 0 0 0 .6 5.5Z" transform="translate(-1 1.5) scale(.95)" /></svg>;
}

class ApiFailure extends Error {
  constructor(public code?: string) { super(code); }
}

function errorCode(data: unknown) {
  return data && typeof data === 'object' && typeof (data as { code?: unknown }).code === 'string' ? (data as { code: string }).code : undefined;
}

export default function Workspace() {
  const [language, setLanguage] = useState<Language>('ja');
  const copy = translations[language];
  const [apiKey, setApiKey] = useState('');
  const [draftKey, setDraftKey] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<'' | 'saved' | 'deleted'>('');
  const [url, setUrl] = useState('');
  const [history, setHistory] = useState<Evaluation[]>([]);
  const [selected, setSelected] = useState<string>();
  const [axisKey, setAxisKey] = useState<AxisKey>('informationDensity');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string>('');
  const [notice, setNotice] = useState<'' | 'analysisDone' | 'cancelled' | 'deleted' | 'historyCleared'>('');
  const [elapsed, setElapsed] = useState(0);
  const [characters, setCharacters] = useState(0);
  const [sort, setSort] = useState('newest');
  const [confirmClear, setConfirmClear] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLElement>(null);
  const keyInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const busy = phase !== 'idle';
  const result = history.find(r => r.id === selected) ?? history[0];
  const answer = result?.answers[axisKey];
  const sorted = [...history].sort((a, b) => sort === 'score' ? a.overallAiSlopScore - b.overallAiSlopScore : b.timestamp.localeCompare(a.timestamp));
  const noticeText = notice === 'analysisDone' ? copy.analysisDone : notice === 'cancelled' ? copy.cancelled : notice === 'deleted' ? copy.deleted : notice === 'historyCleared' ? copy.historyCleared : '';

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const sessionKey = sessionStorage.getItem(API_KEY_STORAGE);
        setApiKey(sessionKey || '');
        localStorage.removeItem(API_KEY_STORAGE);
        const savedLanguage = localStorage.getItem(LANGUAGE_STORAGE);
        if (savedLanguage === 'ja' || savedLanguage === 'en') setLanguage(savedLanguage);
        else setLanguage(browserLanguage());
      } catch {
        setLanguage(browserLanguage());
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem(LANGUAGE_STORAGE, language); } catch { /* memory fallback */ }
  }, [language]);
  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
    return () => clearInterval(timer);
  }, [busy]);
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!settingsOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => keyInputRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); setSettingsOpen(false); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, input, select')).filter(element => !element.hasAttribute('disabled'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); previous?.focus(); };
  }, [settingsOpen]);

  function explain(code?: string) {
    return (code && copy.errors[code]) || copy.genericError;
  }

  function saveSettings() {
    const nextKey = draftKey.trim() || apiKey;
    setApiKey(nextKey);
    try {
      if (nextKey) sessionStorage.setItem(API_KEY_STORAGE, nextKey);
      else sessionStorage.removeItem(API_KEY_STORAGE);
      localStorage.removeItem(API_KEY_STORAGE);
    } catch { /* keep the key in memory when storage is unavailable */ }
    setDraftKey('');
    setSettingsNotice('saved');
  }

  function deleteKey() {
    setApiKey('');
    setDraftKey('');
    try {
      sessionStorage.removeItem(API_KEY_STORAGE);
      localStorage.removeItem(API_KEY_STORAGE);
    } catch { /* memory is already cleared */ }
    setSettingsNotice('deleted');
  }

  async function evaluate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (abortRef.current) return;
    if (!apiKey.trim()) { setError('MISSING_KEY'); setNotice(''); return; }
    const controller = new AbortController();
    abortRef.current = controller;
    setError(''); setNotice(''); setShowDetails(false); setElapsed(0); setCharacters(0); setPhase('fetching');
    try {
      const response = await fetch('/api/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ url }), signal: controller.signal });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new ApiFailure(errorCode(data));
      }
      if (!response.body) throw new ApiFailure('UNEXPECTED');
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
            const message = JSON.parse(line) as { phase?: string; code?: string; characterCount?: number; result?: Evaluation };
            if (message.phase === 'error') throw new ApiFailure(message.code);
            if (message.phase === 'fetching' || message.phase === 'evaluating') setPhase(message.phase);
            if (Number.isFinite(message.characterCount)) setCharacters(message.characterCount!);
            if (message.phase === 'complete' && message.result) {
              setHistory(old => [message.result!, ...old]); setSelected(message.result.id); setAxisKey('informationDensity'); setShowDetails(false);
              setNotice('analysisDone'); completed = true;
            }
          }
          if (done) break;
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      if (!completed) throw new ApiFailure('UNEXPECTED');
      requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true }));
    } catch (caught) {
      if (controller.signal.aborted) setNotice('cancelled');
      else setError(caught instanceof ApiFailure ? caught.code ?? 'UNEXPECTED' : 'UNEXPECTED');
    } finally { setPhase('idle'); abortRef.current = null; }
  }

  function download(format: 'csv' | 'json') {
    const content = format === 'csv' ? resultsCsv(history) : JSON.stringify({ rubricVersion: 'overall-v1-title-body', questionSet: 'eight-detail-axes-plus-overall-jev-judgment', results: history }, null, 2);
    const objectUrl = URL.createObjectURL(new Blob([content], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' }));
    const link = document.createElement('a'); link.href = objectUrl; link.download = `jevslop-${new Date().toISOString().slice(0, 10)}.${format}`; link.click();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }

  function chooseResult(id: string) {
    setSelected(id); setShowDetails(false); setAxisKey('informationDensity');
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' }));
    requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: true }));
  }

  return <main className={`workspace ${busy || result || error ? 'has-content' : ''}`}>
    <button className="settings-button" type="button" aria-label={copy.settings} aria-haspopup="dialog" aria-expanded={settingsOpen} onClick={() => { setSettingsNotice(''); setDraftKey(''); setSettingsOpen(true); }}><SettingsIcon /></button>
    <section className="search-stage" aria-label={copy.urlLabel}>
      <div className="search-group">
        <h1 className="wordmark"><Image src="/logo.svg" alt="" aria-hidden="true" width={56} height={56} /><span>JevSlop</span></h1>
        <form onSubmit={evaluate}>
          <label htmlFor="article-url" className="sr-only">{copy.urlLabel}</label>
          <div className={`url-control ${busy ? 'is-busy' : ''}`}>
            <svg className="link-icon" width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m10 13 4-4m-6.5 6.5-1 1a4 4 0 0 1-5.7-5.6l4-4a4 4 0 0 1 5.7 0m3 1.6 1-1a4 4 0 0 1 5.7 5.6l-4 4a4 4 0 0 1-5.7 0" transform="translate(1 1)" /></svg>
            <input id="article-url" type="url" inputMode="url" required maxLength={2048} autoComplete="off" spellCheck={false} placeholder={copy.urlPlaceholder} value={url} onChange={e => setUrl(e.target.value)} disabled={busy} aria-describedby="input-description" />
            <button className="submit-button" type="submit" disabled={busy} aria-label={busy ? copy.analyzing : copy.submit}><Arrow /></button>
          </div>
          <p id="input-description" className="sr-only">{copy.inputDescription}</p>
        </form>
      </div>
      {error && <div className="error" role="alert"><p>{explain(error)}</p>{error === 'MISSING_KEY' && <button type="button" className="error-action" onClick={() => { setSettingsNotice(''); setDraftKey(''); setSettingsOpen(true); }}>{copy.openSettings}</button>}</div>}
      <div className="sr-only" role="status" aria-live="polite">{noticeText || (phase === 'fetching' ? copy.fetching : phase === 'evaluating' ? copy.evaluating(characters.toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US')) : '')}</div>
      {busy && <div className="processing" aria-label={copy.analyzing}>
        <span className="activity-line" aria-hidden="true" />
        <p>{phase === 'fetching' ? copy.fetching : copy.evaluating(characters.toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US'))}</p>
        <span className="elapsed mono" aria-hidden="true">{elapsed.toFixed(1)}s</span>
        <button type="button" className="quiet-button" onClick={() => abortRef.current?.abort()}>{copy.cancel}</button>
      </div>}
    </section>

    {result && !busy && <>
      <section className="result-summary enter" key={result.id} aria-label={copy.resultAria} ref={resultRef} tabIndex={-1}>
        <a className="result-title" href={result.url} target="_blank" rel="noreferrer noopener">{result.title}<span aria-hidden="true"> ↗</span></a>
        <h2 className="verdict">{result.classification === 'AI Slop' ? copy.aiSlop : copy.notAiSlop}</h2>
        <div className="summary-score"><span className="overline">{copy.score}</span><p className="score-value"><strong>{fixed(result.overallAiSlopScore)}</strong><span>/ 100</span></p></div>
        <p className="verdict-note">{copy.overallVerdictNote}</p>
        <p className="verdict-note">{copy.authorshipNote}</p>
        <button className="details-button" type="button" aria-expanded={showDetails} aria-controls="score-details" onClick={() => setShowDetails(!showDetails)}>{showDetails ? copy.detailsOpen : copy.detailsClosed}<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={showDetails ? 'chevron open' : 'chevron'} aria-hidden="true"><path d="m5 7 5 5 5-5" /></svg></button>
      </section>

      {showDetails && <section id="score-details" className="score-details enter" aria-labelledby="detail-heading">
        <div className="detail-heading"><h2 id="detail-heading">{copy.detailsHeading}</h2><span>{result.model}</span></div>
        <div className="score-overview"><dl className="run-info"><div><dt>{copy.articleLength}</dt><dd>{copy.characters(result.characterCount.toLocaleString(language === 'ja' ? 'ja-JP' : 'en-US'))}</dd></div><div><dt>{copy.duration}</dt><dd>{seconds(result.durationMs)}</dd></div><div><dt>{copy.jevDuration}</dt><dd>{seconds(result.jevDurationMs)}</dd></div><div><dt>{copy.evaluatedAt}</dt><dd>{formatTime(result.timestamp, language)}</dd></div></dl></div>
        <p className="classification-rule">{copy.classificationRule}</p>
        <div className="source-meta"><a href={result.url} target="_blank" rel="noreferrer noopener">{result.url}</a>{result.author && <span>{result.author}</span>}<span>{copy.sourceMode}</span></div>
        <div className="axis-list"><div className="axis-list-heading"><span>{copy.axesHeading}</span><span>{copy.score100}</span><span>{copy.confidence}</span></div>
          {AXES.map((a, index) => { const axisCopy = copy.axis[a.key]; return <button key={a.key} type="button" className={`axis-row ${axisKey === a.key ? 'active' : ''}`} onClick={() => setAxisKey(a.key)} aria-pressed={axisKey === a.key} style={{ '--delay': `${index * 25}ms` } as CSSProperties}>
            <span className="axis-name">{axisCopy.name}<small>{axisCopy.direction}</small></span>
            <span className="axis-score"><span className="mini-bar" aria-hidden="true"><i style={{ transform: `scaleX(${result.scores[a.key] / 100})` }} /></span>{fixed(result.scores[a.key])}</span>
            <span className="confidence">{percent(result.answers[a.key].confidence)}<span aria-hidden="true"> ›</span></span>
          </button>; })}
        </div>
        <p className="axis-footnote">{copy.axisFootnote}</p>
        {answer && <div className="distribution" key={`${result.id}-${axisKey}`}>
          <div className="distribution-heading"><div><h3>{copy.distribution(copy.axis[axisKey].name)}</h3><p>{copy.axis[axisKey].description}</p></div><span className="metric-key mono">{axisKey}</span></div>
          <div className="probability-chart" aria-label={`${copy.axis[axisKey].name}: ${copy.probability}`}>
            {copy.axis[axisKey].levels.map((label, i) => <div className="probability-column" key={i}><span className="probability-number">{percent(answer.probabilities[i])}</span><div className="probability-track" aria-hidden="true"><div className="probability-bar" style={{ '--probability': answer.probabilities[i], '--delay': `${i * 40}ms` } as CSSProperties} /></div><span className="level-index">L{i + 1}</span><span className="level-label">{label}</span></div>)}
          </div>
          <div className="distribution-stats"><span>{copy.originalScore} <b>{answer.score.toFixed(3)} / 4</b></span><span>{copy.confidence} <b>{percent(answer.confidence)}</b></span></div>
        </div>}
        <div className="label-section"><label htmlFor="result-label">{copy.label}<span>{copy.labelHint}</span></label><input id="result-label" maxLength={80} placeholder={copy.labelPlaceholder} value={result.label} onChange={e => { const label = e.target.value; setHistory(old => old.map(r => r.id === result.id ? { ...r, label } : r)); }} /></div>
        <details className="plain-details"><summary>{copy.methodSummary}</summary><div className="method-body"><p>{copy.methodBody}</p><p>{copy.methodLimit}</p><p>{copy.methodData}</p><a href="https://docs.typesafe.ai/primitives/score" target="_blank" rel="noreferrer noopener">{copy.scoreSpecification}</a></div></details>
        <details className="plain-details"><summary>{copy.rawResponse}</summary><pre>{JSON.stringify({ model: result.model, answers: result.answers, overallAiSlopScoreAnswer: result.overallAiSlopScoreAnswer, overallAiSlopLabelAnswer: result.overallAiSlopLabelAnswer, usage: result.usage, requestId: result.requestId }, null, 2)}</pre></details>
      </section>}
    </>}

    {history.length > 0 && <section className="history-section">
      <button className="history-toggle" type="button" aria-expanded={showHistory} aria-controls="comparison" onClick={() => setShowHistory(!showHistory)}>{showHistory ? copy.historyClose : copy.historyOpen(history.length)}</button>
      {showHistory && <div id="comparison" className="comparison enter">
        <div className="comparison-heading"><h2>{copy.historyHeading}</h2><div className="export-actions" aria-label={copy.export}><button type="button" onClick={() => download('csv')}>CSV <Arrow down /></button><button type="button" onClick={() => download('json')}>JSON <Arrow down /></button></div></div>
        <div className="table-toolbar"><p>{copy.selectNotice}</p><label htmlFor="sort">{copy.sortLabel}<select id="sort" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">{copy.sortNewest}</option><option value="score">{copy.sortScore}</option></select></label></div>
        <div className="table-scroll" role="region" aria-label={copy.comparisonAria} tabIndex={0}><table><thead><tr><th scope="col" className="title-col">{copy.articleAndLabel}</th><th scope="col">{copy.classificationAndScore}</th>{AXES.map(a => <th scope="col" key={a.key}>{copy.axis[a.key].name}<small>{copy.axis[a.key].direction}<br />{copy.score100} / {copy.confidence}</small></th>)}<th scope="col">{copy.processingTime}</th><th scope="col"><span className="sr-only">{copy.delete}</span></th></tr></thead><tbody>{sorted.map(r => <tr key={r.id} className={r.id === result?.id ? 'selected-row' : ''}><th scope="row" className="title-col"><button type="button" className="table-title" onClick={() => chooseResult(r.id)} aria-current={r.id === result?.id ? 'true' : undefined}>{r.title}</button><a className="table-url" href={r.url} target="_blank" rel="noreferrer noopener">{r.url}</a>{r.label && <span className="table-label">{r.label}</span>}</th><td className="table-slop">{fixed(r.overallAiSlopScore)}<small>{r.classification === 'AI Slop' ? copy.aiSlop : copy.notAiSlop}</small></td>{AXES.map(a => <td key={a.key}>{fixed(r.scores[a.key])}<small>{percent(r.answers[a.key].confidence)}</small></td>)}<td>{seconds(r.durationMs)}</td><td><button type="button" className="delete-button" aria-label={copy.deleteFromHistory(r.title)} onClick={() => { setHistory(old => old.filter(item => item.id !== r.id)); setNotice('deleted'); }}>{copy.delete}</button></td></tr>)}</tbody></table></div>
        <div className="history-footer"><p>{copy.historyNotice}</p>{confirmClear ? <div className="clear-confirm"><span>{copy.clearConfirm(history.length)}</span><button type="button" className="danger-button" onClick={() => { setHistory([]); setSelected(undefined); setShowDetails(false); setShowHistory(false); setConfirmClear(false); setNotice('historyCleared'); }}>{copy.clear}</button><button type="button" onClick={() => setConfirmClear(false)}>{copy.back}</button></div> : <button type="button" className="quiet-button" onClick={() => setConfirmClear(true)}>{copy.clearHistory}</button>}</div>
      </div>}
    </section>}

    {settingsOpen && <div className="settings-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSettingsOpen(false); }}>
      <section ref={dialogRef} className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="settings-heading"><h2 id="settings-title">{copy.settingsTitle}</h2><button type="button" className="dialog-close" aria-label={copy.close} onClick={() => setSettingsOpen(false)}>×</button></div>
        <div className="settings-field"><label htmlFor="typesafe-key">{copy.apiKeyLabel}</label><input ref={keyInputRef} id="typesafe-key" type="password" autoComplete="off" spellCheck={false} placeholder={copy.apiKeyPlaceholder} value={draftKey} onChange={event => setDraftKey(event.target.value)} /></div>
        <p className={`key-status ${apiKey ? 'configured' : 'missing'}`}>{apiKey ? copy.apiKeyConfigured : copy.apiKeyMissing}</p>
        <div className="settings-field"><label htmlFor="language">{copy.language}</label><select id="language" value={language} onChange={event => setLanguage(event.target.value as Language)}><option value="ja">日本語</option><option value="en">English</option></select></div>
        <div className="settings-explanation"><p>{copy.settingsPrivacy}</p><p>{copy.settingsTransport}</p></div>
        {settingsNotice && <p className="settings-notice" role="status">{settingsNotice === 'saved' ? copy.settingsSaved : copy.settingsDeleted}</p>}
        <div className="settings-actions"><button type="button" className="danger-button" onClick={deleteKey}>{copy.deleteKey}</button><button type="button" className="save-button" onClick={saveSettings}>{copy.save}</button></div>
      </section>
    </div>}
  </main>;
}
