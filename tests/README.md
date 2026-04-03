# Tests

## 1. Unit / component (Vitest + jsdom)

**What:** Isolated functions, hooks, and server-side credibility logic.

**Folders:** `tests/unit/`, `tests/functions/`

**Run:** `npm run test:run` · `npm test` (watch) · `npm run test:coverage`

---

## 2. Integration (Vitest + React Testing Library)

**What:** The real `App` route tree with **mocked `AuthContext`** and `MemoryRouter`—no Firebase session, no browser. Checks that protected routes send anonymous users to login and that `/` shows the landing hero.

**Folder:** `tests/integration/`

**Run:** same as Vitest (`npm run test:run` includes these).

---

## 3. End-to-end (Playwright)

**What:** Real Chromium against the Vite dev server—public landing, auth gate, signup query string. Aligns with module guidance on e2e tools for system-level checks.

**Folder:** `tests/e2e/`

**Run:** `npm run test:e2e` · `npm run test:e2e:ui`

**First-time setup:** after `npm install`, run:

```bash
npx playwright install chromium
```

If browsers live in a custom path, set `PLAYWRIGHT_BROWSERS_PATH` as per Playwright docs.

Requires the same Firebase client config as local dev so auth initialisation can complete.
