# Security and privacy

JevSlop is a BYOK application. Each user supplies their own TypeSafe API key in the browser; the site operator does not provide a shared key.

## Key handling

- The key is entered through a password field and is not rendered back to the page.
- Default storage is JavaScript memory plus `sessionStorage`; closing the tab removes the session copy.
- `localStorage` is used only after the user explicitly enables **Remember on this device**.
- The key is sent in an `Authorization` header to the same-origin `/api/evaluate` Pages Function. It is never put in a URL, query string, response, result object, export, or application log.
- The Function forwards the key to the fixed `https://api.typesafe.ai` endpoint for one request and does not persist it. It rejects other HTTP methods, cross-site browser requests, oversized request bodies, and non-note URLs.
- The Function and SDK do not emit application logs or analytics. Cloudflare's platform-level metadata is governed by Cloudflare's own policies.

## Article and result data

The Function fetches only public HTTPS `note.com/<user>/n/<id>` pages, validates every redirect, and extracts the title and visible body. It does not bypass access controls or store the article. TypeSafe receives only `{ title, body }`; source URL and comparison metadata stay outside Jev state. Comparison history is tab memory, and CSV/JSON exports exclude article text.

## Reporting

Please do not open a public issue with an API key, private article, or other sensitive data. For a security issue, contact the repository maintainers privately through GitHub and include a minimal reproduction without secrets.
