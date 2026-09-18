# AGENTS.md
- Read `SPEC.md` and `EXPERIMENT.md` before changing code; they define the product and frozen experiment.
- Finish authorized work end-to-end; do not stop for noncritical clarification or cosmetic choices.
- Use current official TypeSafe/Jev docs and SDK; never invent API shapes or expose `TYPESAFE_API_KEY` client-side.
- Keep Jev judgments atomic and independent; compute the composite Slop Score deterministically in code.
- Treat JevSlop as a writing-quality experiment, not an AI-authorship detector, and preserve uncertainty honestly.
- Prefer a small maintainable implementation; avoid unnecessary abstractions, agents, tests, and documentation.
- Run focused checks plus one end-to-end local flow before declaring the task complete.
- Never commit secrets, fetched article bodies, or experiment results; perform Git actions only when explicitly requested.
