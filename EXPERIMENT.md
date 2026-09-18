# JevSlop — Frozen Experiment Protocol

This file exists to prevent changing the test after seeing convenient results.

## Question

Can Jev make a useful whole-article writing-quality judgment, alongside eight transparent detail signals, using only the article title and body and the rubric in `SPEC.md`?

This is **not** an experiment that proves AI authorship. A human article can score poorly and an AI-assisted article can score well.

## Groups

Prepare the URLs before examining Jev results.

### A — Known AI-heavy
- The user's two existing note articles that the user knows were written mostly with AI assistance.
- Record that provenance outside JevSlop/Jev; do not reveal it to the model.

### B — Human control
- Prefer 3–5 articles with strong reason to expect human authorship.
- Strongest practical control: articles published before widespread generative-AI writing tools, ideally before late 2022.
- Well-known authors are useful only if authorship provenance is reasonably clear; fame alone is not proof of no AI assistance.

### C — Current unknown (optional)
- 2–3 recent articles where AI use is genuinely unknown.
- Treat them as unknown, not as human ground truth.

### D — Self-test
- After the final Jev note article is finished, evaluate that article itself as a final demonstration.
- Do not change the scoring rubric afterward merely to improve this result.

## Blinding

The Jev state must contain exactly `{ title, body }`: the original article title and normalized visible body. The user authorized this change on 2026-09-18 before the first evaluation; use `overall-v1-title-body` for this protocol. Title and body can themselves reveal context; do not add separate source metadata or rewrite the prose. Do not send author, URL, date, group, expected label, article popularity, or any statement such as “this was AI-written.”

The app may attach those fields to local result metadata after the response is returned.

The user's API key is transport-only authentication. It is not experiment state and is never included in Jev's request body, result metadata, or exports.

## Frozen analysis

Use the direct whole-article Score and choice from `SPEC.md` for the primary result. Keep the eight dimensions as separate detail evidence; do not recompute the primary result from their average or weights.

If a flaw is discovered after results are seen, keep the original result, document the flaw, and treat any changed rubric as a separate second analysis rather than silently replacing the first.

The UI uses Jev's direct overall choice: `AI Slop` or `Not AI Slop`. This is a writing-quality judgment, not an AI-authorship detector or ground truth. The primary analysis must still report the continuous overall Score, each detail dimension and uncertainty. Do not replace the choice with a threshold after examining outcomes.

## Data to record

For every article record:
- article/group identifier
- publication era/date when known
- character count
- all eight normalized scores
- raw Jev probabilities/uncertainty data exposed by the SDK
- overall Jev AI Slop Score and choice
- evaluation latency
- model/version identifier if the API exposes it
- extraction mode and whether chunking occurred
- state mode (`title-and-body`) and rubric version (`overall-v1-title-body`)
- display classification, no threshold, and policy (`jev-overall-choice-v1`)

For the note article, preserve screenshots of a few representative results and export the final comparison as CSV/JSON.

## Interpretation

Interesting outcomes include both successes and failures:
- AI-heavy articles score materially higher than human controls.
- Some AI-heavy writing scores low because it was edited well.
- Some human writing scores high because it is generic/repetitive.
- Individual axes can explain a different reader impression from the direct overall judgment.
- Jev is uncertain on specific dimensions.

Do not hide counterexamples. They are part of the result and make the eventual article more credible.
