# JevSlop — Frozen Experiment Protocol

This file exists to prevent changing the test after seeing convenient results.

## Question

Can Jev distinguish writing that contains more AI-Slop-like characteristics from writing expected to contain fewer of those characteristics, using only the article title and body and the fixed eight-axis rubric in `SPEC.md`?

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

The Jev state must contain exactly `{ title, body }`: the original article title and normalized visible body. The user authorized this change on 2026-09-18 before the first evaluation; use `frozen-v1-title-body` for this protocol. Title and body can themselves reveal context; do not add separate source metadata or rewrite the prose. Do not send author, URL, date, group, expected label, article popularity, or any statement such as “this was AI-written.”

The app may attach those fields to local result metadata after the response is returned.

## Frozen analysis

Use the eight dimensions and weights from `SPEC.md` unchanged for the main reported experiment.

If a flaw is discovered after results are seen, keep the original result, document the flaw, and treat any changed rubric as a separate second analysis rather than silently replacing the first.

The UI uses a user-requested binary label: `AI Slop` for unrounded Slop Score ≥ 50, `Not AI Slop` below 50 (`midpoint-v1`, added 2026-09-18 before the first live evaluation). This is an unvalidated presentation convention, not an AI-authorship detector or ground truth. The primary analysis must still report the continuous score, each dimension and uncertainty. Do not tune this boundary after examining outcomes.

## Data to record

For every article record:
- article/group identifier
- publication era/date when known
- character count
- all eight normalized scores
- raw Jev probabilities/uncertainty data exposed by the SDK
- composite Slop Score
- evaluation latency
- model/version identifier if the API exposes it
- extraction mode and whether chunking occurred
- state mode (`title-and-body`) and rubric version (`frozen-v1-title-body`)
- display classification, threshold (50) and policy (`midpoint-v1`)

For the note article, preserve screenshots of a few representative results and export the final comparison as CSV/JSON.

## Interpretation

Interesting outcomes include both successes and failures:
- AI-heavy articles score materially higher than human controls.
- Some AI-heavy writing scores low because it was edited well.
- Some human writing scores high because it is generic/repetitive.
- Individual axes separate groups even when the composite score does not.
- Jev is uncertain on specific dimensions.

Do not hide counterexamples. They are part of the result and make the eventual article more credible.
