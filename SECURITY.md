# Security and privacy

JevSlop is a BYOK application. Each user supplies their own TypeSafe API key in the browser; the site operator does not provide a shared key.

## Key handling

- The key is entered through a password field and is not rendered back to the page.
- The key is held only in JavaScript memory and `sessionStorage`; closing the tab removes the session copy. It is never persisted in `localStorage`.
- The key is sent in an `Authorization` header to the same-origin `/api/evaluate` Pages Function. It is never put in a URL, query string, response, result object, export, or application log.
- During analysis, the browser sends the key through the same-origin Cloudflare Pages Function to the fixed `https://api.typesafe.ai` endpoint. JevSlop application code does not store or log the key, and the Function does not include it in responses or exports.
- The Function rejects other HTTP methods, cross-site browser requests, oversized request bodies, and non-note URLs. The Function and SDK do not emit application logs or analytics.
- Cloudflare infrastructure processing and observability metadata are governed by Cloudflare's policies. TypeSafe's handling of API requests is governed by TypeSafe's policies.

## Content Security Policy

`public/_headers` sets `default-src 'self'`, same-origin-only connections, no objects, no base URI, no framing, same-origin form actions, and no external script origins or `unsafe-eval`. Next.js static export emits two required inline React bootstrap/flight scripts whose embedded build identifier changes on each build, so a static header cannot safely pin stable SHA-256 hashes without adding a build-time header generator. The policy therefore permits inline scripts only as required by that export, blocks inline script attributes, and permits inline style attributes only because the existing React UI writes dynamic animation styles; stylesheet elements remain same-origin only.

## Article and result data

The Function fetches only public HTTPS `note.com/<user>/n/<id>` pages, validates every redirect, and extracts the title and visible body. It does not bypass access controls or store the article. TypeSafe receives only `{ title, body }`; source URL and comparison metadata stay outside Jev state. Comparison history is tab memory, and CSV/JSON exports exclude article text.

## Public deployment

For public operation, configure Cloudflare rate limiting for `/api/evaluate` as appropriate. The Function's Origin and `Sec-Fetch-Site` checks are request-origin protections, not rate limiting or authentication.

## Reporting

Please do not open a public issue with an API key, private article, or other sensitive data. For a security issue, contact the repository maintainers privately through GitHub and include a minimal reproduction without secrets.
