# JevSlop

JevSlop is a local web app for testing whether TypeSafe Jev can identify characteristics associated with low-quality “AI Slop” writing in public note articles.

The app is deliberately **not** an AI-authorship detector. It evaluates eight observable writing dimensions with Jev, then computes a transparent composite score in ordinary code.

## Start with Codex

1. Extract this archive directly under `~/projects` so the folder becomes `~/projects/JevSlop`.
2. Open that folder in Codex.app.
3. Open `CODEX_START.md` and send its prompt as the first task.
4. When the implementation needs the API key, put your existing TypeSafe key in `.env.local` as `TYPESAFE_API_KEY=...`. Never paste the key into source files or chat logs.

`SPEC.md` is the product contract. `EXPERIMENT.md` freezes the comparison protocol before results are seen.
