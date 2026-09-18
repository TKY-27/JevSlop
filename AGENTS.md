# JevSlop project rules
- Read `SPEC.md` and `EXPERIMENT.md` before changing the frozen evaluation contract.
- Use the current official TypeSafe/Jev SDK and API; never invent request or response shapes.
- Keep BYOK keys out of URLs, logs, exports, persistence, and source; do not add a shared operator key.
- Keep Jev judgments atomic and compute Slop Score deterministically in application code.
- Treat JevSlop as a writing-quality tool, not an AI-authorship detector.
- Preserve existing work, make the smallest complete change, and avoid unrelated dependencies.
- Run focused tests, lint, typecheck, build, and one local end-to-end flow before completion.
- Never commit secrets, fetched article bodies, or experiment results.
