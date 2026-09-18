# JevSlop

JevSlop asks TypeSafe Jev for a whole-article writing-quality judgment and eight detail signals. It shows a transparent AI Slop Score; it is not an AI-authorship detector. [日本語版](README.ja.md)

## What it does

Paste a public `https://note.com/<user>/n/<article-id>` URL, then choose **Analyze**. JevSlop fetches the article, extracts its title and visible body, asks Jev for a whole-article AI Slop judgment and score, and shows eight separate writing-quality detail signals.

- Japanese and English UI, selected from the browser language on first visit.
- Eight atomic detail `Score` questions plus a Jev overall `Score` and `choice` in one `systemOne` request.
- Jev-derived overall `AI Slop Score` from 0–100, per-axis distributions, confidence, timing, and comparison history.
- CSV/JSON exports contain numeric results and metadata, never the article body or API key.
- Full-body evaluation only: no silent truncation or chunking.
- Reduced-motion, keyboard, focus, Escape-to-close, and mobile support.
- `public/logo.svg`, `public/favicon.svg`, and a 1200×630 `public/og-image.png` provide the shared brand and social metadata assets.

The primary `AI Slop` / `Not AI Slop` label is Jev's whole-article choice, not an average or weighted sum of the eight detail axes. It describes writing characteristics: a human article can score high, and AI-assisted writing can score low. The result must not be read as an authorship probability.

## Bring Your Own Key

Open **Settings** from the fixed gear button in the top-right corner and enter your own TypeSafe API key. The password field does not reveal a saved key. The key is held only in memory and `sessionStorage`; it is not stored in `localStorage` and is cleared when the tab closes.

No operator key is required. Do not put `TYPESAFE_API_KEY` in Cloudflare Pages variables for this application.

## Privacy and data flow

```text
Browser -- same-origin POST + Authorization header --> JevSlop Pages Function
Pages Function -- fetch public note HTML --> note.com
Pages Function -- title/body + user's key --> TypeSafe API
```

During analysis, the browser sends the key through the same-origin `/api/evaluate` Cloudflare Pages Function, which validates the note host and redirects, extracts only the title/body needed for evaluation, and forwards the key to the fixed TypeSafe endpoint. JevSlop application code does not store or log the key; the Function does not persist it or include it in responses or exports. Cloudflare infrastructure processing and observability metadata follow Cloudflare's policies, and TypeSafe API processing follows TypeSafe's policies. The SDK runs with logging off and retries disabled.

TypeSafe receives exactly `{ title, body }`. URL, author, date, comparison labels, and experiment groups are excluded from Jev state. The article body is not kept in browser history or result exports; result history exists in the current tab's memory only.

## Local development

Requirements: Node.js 22.12+.

```sh
npm install
npm run dev
```

`npm run dev` builds the static export and starts the Pages Functions-compatible local server at `http://localhost:8788`. Enter your key in the Settings dialog; no `.env` file is needed. For checks:

```sh
npm test
npm run lint
npm run typecheck
npm run build
```

## Cloudflare Pages deployment

Connect [TKY-27/JevSlop](https://github.com/TKY-27/JevSlop) to Cloudflare Pages with these values:

| Setting | Value |
| --- | --- |
| Framework preset | Next.js (Static HTML Export) |
| Production branch | `main` |
| Build command | `npx next build` |
| Build output directory | `out` |
| Root directory | `/` (repository root) |
| Environment variables | None required |

The static UI is a Next.js export. The repository's `functions/` directory supplies the `/api/evaluate` Pages Function automatically; do not remove it and do not add a shared TypeSafe secret. The dashboard Git integration performs the production deploy; no manual Cloudflare deploy command is required.

For public operation, configure Cloudflare rate limiting for `/api/evaluate` as appropriate. The Function's Origin and `Sec-Fetch-Site` checks are not rate limiting or authentication.

## Limitations

Only public, free, full-text note articles are supported. Private, paid, deleted, non-HTML, oversized, or unsupported-layout pages fail closed. Images, audio, video, and embedded content are not evaluated. TypeSafe limits, network failures, and Japanese/English calibration differences can affect results; confidence is not a correctness guarantee.

## License

MIT. See [LICENSE](LICENSE).
