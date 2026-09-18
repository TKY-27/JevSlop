# First Codex task

Copy the prompt below into a new Codex session opened at this repository root.

---

Read `AGENTS.md`, `SPEC.md`, and `EXPERIMENT.md` completely, then implement **JevSlop** to the acceptance criteria in `SPEC.md` in this session.

You are authorized to create/modify project files, install only necessary dependencies, and run the focused checks needed to finish the app. Do not stop for noncritical clarification; make reversible implementation choices yourself. Do not perform Git commits/pushes or expose secrets.

Before implementing the Jev integration, verify the current official TypeSafe documentation and `typesafe-ai/typesafe-sdk-js`. If useful, install the official TypeSafe project skill for Codex (`typesafe-ai/skills`, skill `typesafe-ai`) and use it. The product spec is semantic authority if examples elsewhere conflict with the experiment design.

Build a clean local full-stack TypeScript app with one dev command. A public `note.com/.../n/...` URL must be enough: validate/fetch server-side, extract the visible article body, send **only the body** to Jev, evaluate the eight frozen independent Score dimensions, preserve the real probability/uncertainty data the current SDK exposes, and compute the frozen 0–100 Slop Score deterministically in ordinary code. Never present the result as AI-authorship probability.

Implement comparison history, blind experiment labels, screenshot-friendly results, and CSV/JSON numeric export without persisting/exporting full article bodies. Keep the TypeSafe API key server-only. Do not bypass note access controls or silently truncate long articles.

Keep the UI restrained and research-tool-like rather than generic AI-dashboard styling. Japanese UI should be the default. Avoid overengineering and broad test generation: cover URL/redirect safety, extraction, score math, blinding, and secret boundaries; then run typecheck/lint/build and one local end-to-end happy path. If a real TypeSafe key is available in `.env.local`, run one real Jev smoke evaluation; otherwise use a faithful mock only for the final flow and explicitly state that the real API smoke was not run.

At completion, leave the repository runnable and summarize: implemented behavior, exact checks run, whether a real Jev request was verified, and any remaining limitation that materially affects the experiment.
