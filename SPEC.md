# JevSlop — Product Specification

## 1. Goal

Build a local-first web app named **JevSlop** that accepts a public `note.com` article URL, extracts the visible article body automatically, evaluates writing-quality signals with TypeSafe Jev, and presents a reproducible **AI Slop Score (0–100)** plus the underlying dimensions and uncertainty.

The product must never claim to detect whether AI wrote an article. Its claim is narrower: it measures characteristics associated with low-information, generic, repetitive, formulaic writing.

## 2. Core user flow

1. User pastes a public note article URL.
2. Server validates the URL and fetches the page; no manual article copy/paste is required.
3. App extracts title, author/date when available, and the visible article body.
4. Jev evaluates eight atomic dimensions against the article body only.
5. Ordinary application code normalizes the eight results and computes the composite Slop Score.
6. UI shows the result, per-axis scores/probabilities/confidence, latency, article length, and comparison history.
7. User can compare multiple articles and export the numeric results for later note/article analysis.

## 3. Evaluation must be blind

Source metadata can bias the model. Keep URL, author, account name, experiment group, publication date, and user labels outside the Jev `state`.

By default Jev receives only the normalized article body. Do not tell Jev whether an article is AI-heavy, human-written, famous, old, new, or expected to pass/fail. Display metadata in the UI only after evaluation.

Do not translate the article before evaluation. Japanese and English text should be judged in the original language.

## 4. Frozen dimensions

Use one ordered five-level Jev `Score` question for each dimension. Keep the questions atomic and send them in the same `systemOne` evaluation when supported by the current official SDK.

### Positive dimensions — higher is better

**informationDensity** — substantive information relative to length
1. Very little substantive information; mostly filler.
2. Low information density.
3. Moderate information density.
4. High information density.
5. Exceptionally dense while still readable.

**specificity** — concrete details rather than vague generalities
1. Almost entirely vague or generic.
2. Mostly generic.
3. Mixed.
4. Mostly specific and concrete.
5. Highly specific, with concrete details or observations.

**personalEvidence** — firsthand experience, concrete observation, original evidence, or author-specific detail
1. None.
2. Very little.
3. Some.
4. Substantial.
5. Central to the article.

**coherence** — ideas develop logically rather than being connected by superficial transitions
1. Highly incoherent.
2. Often disconnected.
3. Adequate.
4. Coherent.
5. Exceptionally coherent.

### Negative dimensions — higher is worse

**redundancy** — repeating the same ideas without adding useful information
1. Almost no unnecessary repetition.
2. Minor repetition.
3. Some noticeable repetition.
4. Frequent repetition.
5. Extremely repetitive.

**genericness** — how interchangeable the prose is with generic writing on the same subject
1. Highly distinctive to this author and subject.
2. Mostly distinctive.
3. Mixed.
4. Mostly generic.
5. Extremely generic and interchangeable.

**templatePhrasing** — formulaic, predictable, stock phrasing/transitions
1. Almost none.
2. Occasional.
3. Moderate.
4. Frequent.
5. Dominates the writing.

**unnecessaryVerbosity** — text removable without losing useful information, reasoning, evidence, or voice
1. Almost none.
2. A small amount.
3. A moderate amount.
4. A large amount.
5. Most of the article could be substantially compressed.

The implementation may adjust exact SDK syntax only to match the current official API. It must not change the semantic meaning, number, order, or direction of these rubrics without an explicit user request.

## 5. Composite Slop Score

Normalize every five-level Score to 0–100 using the current SDK's numeric Score semantics. Verify the official response shape before implementation rather than assuming it.

For positive dimensions, convert them to slop contribution with `100 - normalizedScore`. For negative dimensions, use the normalized score directly.

Frozen weights:

| Dimension | Weight |
| --- | ---: |
| informationDensity | 20% |
| specificity | 15% |
| redundancy | 15% |
| genericness | 15% |
| templatePhrasing | 15% |
| unnecessaryVerbosity | 10% |
| personalEvidence | 5% |
| coherence | 5% |

Weights sum to 100%. Round the final display to one decimal place; retain higher precision internally.

The UI must label this **Slop Score**, never “AI probability”, “AI-generated probability”, or equivalent.

## 6. Uncertainty and raw evidence

Preserve the full Jev answer data that the official SDK exposes for each dimension, including ordered score, probability distribution, confidence/uncertainty fields if available, model identifier if available, and request latency.

If the current official SDK does not expose a dedicated confidence field for Score answers, do not invent one. Display the probability distribution and derive an uncertainty statistic only if it is mathematically defined and clearly labeled as derived.

The detailed result view should make it possible to inspect why a high or low composite score occurred.

## 7. note URL ingestion

Primary input is a public `https://note.com/.../n/...` URL. No manual copy/paste should be needed in the normal path.

Requirements:
- Fetch server-side so browser CORS is irrelevant and the TypeSafe key remains server-only.
- Allowlist `note.com` article URLs; reject arbitrary hosts and non-HTTPS URLs.
- Revalidate the final host after redirects to avoid SSRF through redirects.
- Add sensible timeout, response-size limit, and clear errors.
- Extract the main visible article text with a robust reader/parser approach such as Mozilla Readability plus DOM parsing. A small note-specific fallback is acceptable if justified.
- Remove navigation, recommendations, comments, share controls, scripts/styles, and other non-article chrome.
- Preserve paragraph order and meaningful headings; normalize whitespace without rewriting prose.
- Do not bypass login, paywalls, private posts, deleted posts, or access controls. Return a clear unsupported/inaccessible error instead.
- Do not permanently store full fetched article bodies by default.

If a normal article exceeds a verified TypeSafe/Jev request limit, never silently truncate. Prefer whole-article evaluation. Only add paragraph-aware chunking if the official limit actually requires it; document aggregation semantics and make the UI disclose that the article was chunked.

## 8. Comparison history

Support several evaluated articles in one local session. Each result should contain:
- title and source URL
- optional user-defined experiment label/group
- Slop Score
- eight normalized dimension scores
- raw probability/uncertainty data where available
- article character count
- evaluation latency
- timestamp
- whether full-body or chunked evaluation was used

Experiment labels are for display/filtering only and must never be sent to Jev.

Allow deletion of individual results and clearing the local history. Persistence may use browser local storage for numeric/metadata results; do not persist article bodies unless the user explicitly requests that later.

Provide CSV and JSON export of result metadata/scores. Do not export full copyrighted article text by default.

## 9. UI/UX

Use a restrained developer-tool / research-tool interface, not a marketing landing page. Japanese UI is the default; metric keys may show their English identifier in secondary text.

Desktop is primary but the page must remain usable on mobile. The important views are:
- URL input + Evaluate action
- current result with large Slop Score and clear “not an AI-authorship detector” wording
- eight-axis detail with probability/uncertainty inspection
- compact comparison table
- screenshot-friendly comparison/result layout for use in the eventual note article

Avoid decorative AI gradients, excessive cards, generic hero copy, fake dashboards, and other “AI Slop” UI patterns.

## 10. Technical direction

Use a simple full-stack TypeScript implementation with one local dev command. Prefer current stable **Next.js App Router** (or an equally simple current full-stack React framework only if there is a concrete compatibility reason), Node.js 20+, and the official `@typesafe-ai/sdk` package.

`TYPESAFE_API_KEY` must be read only on the server from environment variables. Never use a public-prefixed environment variable and never send the key to browser code.

Before coding the Jev integration, inspect the current official TypeSafe docs/SDK and, if useful, install the official TypeSafe Agent Skill project-locally for Codex. Do not copy outdated examples blindly.

Official references as of 2026-09-18:
- https://github.com/typesafe-ai/typesafe-sdk-js
- https://github.com/typesafe-ai/skills
- https://docs.typesafe.ai/

## 11. Error handling

Handle at minimum:
- malformed/non-note URL
- inaccessible/paid/private/deleted article
- extraction produced too little article text
- network timeout / oversized response
- missing API key
- TypeSafe authentication/rate/server error
- unexpected TypeSafe response shape

Errors should state what failed and what the user can do next; do not expose stack traces or secrets in the UI.

## 12. Tests and acceptance criteria

Do not build an oversized test suite. Cover the boundaries that could invalidate the experiment:
- note URL allowlist/redirect validation
- article extraction from a representative saved HTML fixture
- deterministic normalization/composite-score math and frozen weights
- metadata/experiment labels are absent from the Jev state
- API key is server-only

Then run typecheck/lint/build and one end-to-end local happy path. If network access and the user's key are available, perform one real Jev smoke evaluation without storing the article body. Otherwise use a faithful mocked response and clearly report that the real API smoke test remains unexecuted.

The task is complete when a user can paste a public note URL, receive a real Jev-based eight-axis evaluation and transparent Slop Score, compare multiple results, and export the numeric experiment data without manually copying article text.
