# JevSlop — Product Specification

## 1. Goal

Build a public web app named **JevSlop** that accepts a public `note.com` article URL, extracts the visible article body automatically, evaluates writing-quality signals with TypeSafe Jev, and presents a reproducible **AI Slop Score (0–100)** plus the underlying dimensions and uncertainty. Users bring their own TypeSafe API key.

The product must never claim to detect whether AI wrote an article. Its claim is narrower: it measures characteristics associated with low-information, generic, repetitive, formulaic writing.

## 2. Core user flow

1. User pastes a public note article URL.
2. The same-origin Pages Function validates the URL and fetches the page; no manual article copy/paste is required.
3. App extracts title, author/date when available, and the visible article body.
4. Jev evaluates eight atomic dimensions against the article title and body only.
5. Ordinary application code normalizes the eight results and computes the composite Slop Score.
6. UI first shows `AI Slop` or `Not AI Slop`; the Details button reveals Slop Score, per-axis scores/probabilities/confidence, latency and article length. Comparison history is separately expandable.
7. User can compare multiple articles and export the numeric results for later note/article analysis.

## 3. Evaluation must be blind

Source metadata can bias the model. Keep URL, author, account name, experiment group, publication date, and user labels outside the Jev `state`.

Jev receives exactly `{ title, body }`: the article title and normalized visible body. This input policy was explicitly updated on 2026-09-18 before the first evaluation; the eight rubrics and weights are unchanged. Do not tell Jev whether an article is AI-heavy, human-written, famous, old, new, or expected to pass/fail. Display source metadata in the UI only after evaluation. Title/body may inherently mention an author or topic; do not rewrite them to conceal that information.

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

The numeric value is **Slop Score**, never “AI probability”, “AI-generated probability”, or equivalent.

The user requested binary display on 2026-09-18. Code labels the unrounded composite `AI Slop` at 50 or above and `Not AI Slop` below 50 (`midpoint-v1`). This is an unvalidated display convention for writing characteristics, not a classifier of authorship. Preserve the continuous score, threshold, and policy in exports. Do not change the threshold after seeing results to improve the experiment. Near the boundary, display additional precision in the detailed rule to explain rounded scores.

## 6. Uncertainty and raw evidence

Preserve the full Jev answer data that the official SDK exposes for each dimension, including ordered score, probability distribution, confidence/uncertainty fields if available, model identifier if available, and request latency.

If the current official SDK does not expose a dedicated confidence field for Score answers, do not invent one. Display the probability distribution and derive an uncertainty statistic only if it is mathematically defined and clearly labeled as derived.

The detailed result view should make it possible to inspect why a high or low composite score occurred.

## 7. note URL ingestion

Primary input is a public `https://note.com/.../n/...` URL. No manual copy/paste should be needed in the normal path.

Requirements:
- Fetch in the same-origin Pages Function so browser CORS is irrelevant; the user key is accepted only as a transient request header and is never a server environment secret.
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

The UI follows the user-supplied Google start-page reference: a centered **JevSlop** wordmark and a single rounded URL input with an integrated submit action. No subtitle, marketing copy, header/footer navigation, empty result panels or decorative dashboard. Japanese UI is the default.

After evaluation, show the article title, `AI Slop` / `Not AI Slop`, one concise authorship clarification, and a **Details** button. The numeric result, eight axes, probability distributions, confidence, metadata and raw response appear only when Details is expanded. Comparison history and exports have their own disclosure.

PC and smartphone layouts are both required. Prevent page-wide overflow; a comparison table may scroll within its own labeled region. Preserve keyboard focus, accessible names, readable contrast and reduced-motion support. Motion should explain the transition from input to result and reveal distributions without bounces, perpetual decorative movement, or layout thrashing.

Use TypeSafe's official pink `#F386A1` as the source accent, with darker rose text and pale pink controls for contrast. No gradients, glows, beige defaults, card grids, unnecessary subtitles, redundant copy or inflated claims.

Design and copy references reviewed live on 2026-09-18:
- https://impeccable.style/slop/ (layout, motion, repetitive copy, generic claims and forced contrast)
- https://typesafe.ai/ (official palette)
- https://learn.microsoft.com/en-us/style-guide/top-10-tips-style-voice (concise, direct UI wording)
- https://www.nngroup.com/articles/3-cs-microcopy/ (clear, concise, considerate microcopy)

## 10. Technical direction

Use a simple TypeScript implementation with one local dev command: a Next.js static export plus a Cloudflare Pages Function. Use Node.js 22.12+ for local development and the official `@typesafe-ai/sdk` package inside the Function.

The user supplies the TypeSafe API key in the browser. Keep it in memory and `sessionStorage` by default; use `localStorage` only after explicit opt-in. Send it only in an `Authorization` header to the same-origin Function, never in a URL, response, result, export, log, analytics event, or source. Never provide a shared operator key through Cloudflare variables.

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
- only title/body are in the Jev state; source metadata and experiment labels are absent
- BYOK key storage and the key-free result/export boundary

Then run typecheck/lint/build and one end-to-end local happy path. If network access and the user's key are available, perform one real Jev smoke evaluation without storing the article body. Otherwise use a faithful mocked response and clearly report that the real API smoke test remains unexecuted.

The task is complete when a user can paste a public note URL, receive a real Jev-based eight-axis evaluation and transparent Slop Score, compare multiple results, and export the numeric experiment data without manually copying article text.

## Implementation choices (2026-09-18)

- Official JavaScript SDK `@typesafe-ai/sdk` 0.6.0; model pinned to `jev-1.13.0`. One `systemOne` call, automatic retries disabled.
- Live API validation found independently rounded two-decimal scores and probabilities. Validate their consistency using the mathematical rounding bounds (probability sum ±0.025, weighted expectation vs score ±0.055), retain the raw values, and never renormalize or replace the returned score. This wire-format fix leaves the rubric, weights and model unchanged.
- Each Score is 0–4; normalized score = `score * 25`. Preserve the full SDK answer and request/model/token metadata. Rubric identifier: `frozen-v1-title-body`.
- DOM parsing uses Cheerio with the current note-specific `.note-common-styles__textnote-body` container. The public page was inspected directly. Unknown layouts fail closed instead of using a broad whole-page fallback.
- HTML is limited to 3 MiB, note fetch to 20 seconds, Jev to 60 seconds; article body must contain at least 100 Unicode characters. Redirects are validated before each hop.
- Official model limits: 64k tokens for the whole request, 32k for state plus the longest question. No assumed character-to-token conversion or silent truncation. The service can reject an oversized article; no partial score is produced. Chunking is not implemented.
- Comparison history lives only in the current browser tab, without localStorage or a database. JSON/CSV exports are explicit user downloads and exclude article bodies.
- The static UI is deployed with Next.js `output: "export"`; Cloudflare Pages serves `out` and the repository `functions/api/evaluate.ts` handles `/api/evaluate`.
- The Pages Function accepts only same-origin `POST` JSON with a bounded body, validates `note.com` redirects, forwards the user's `Authorization` header only to `https://api.typesafe.ai`, and writes no application logs or persistent data.
- No Cloudflare environment variable is required. The SDK runs inside the Function with explicit user key, logging off, and automatic retries disabled.
