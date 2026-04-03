# Chapter 6.2.1 — figures, code snippets, executed checks

Use this file when pasting into the thesis (Word/LaTeX). All paths are relative to the **repository root**.

---

## 1. Commands to run before screenshots

From project root:

```bash
cd /path/to/EduEire
npm install
npx playwright install chromium   # once per machine, for e2e
```

Capture evidence:

```bash
npm run test:run          # Vitest: unit + integration (expect: all passed)
npm run test:coverage     # optional: terminal summary + open coverage/index.html
npm run test:e2e          # Playwright: 4 tests (expect: all passed)
```

---

## 2. Suggested figures (screenshots)

| Fig. | What to capture | Suggested caption (English) |
|------|-----------------|----------------------------|
| **A** | Terminal after `npm run test:run`: green summary, e.g. `Test Files N passed`, `Tests 24 passed` | *Figure X: Vitest test run — unit and client-side integration tests passing.* |
| **B** | Terminal after `npm run test:coverage`: summary table (or a crop of key rows: `voteScoreDelta`, `commentTree`, `credibility.ts`, etc.) | *Figure X: Code coverage report (excerpt) for automated tests.* |
| **C** | Terminal after `npm run test:e2e`: four Playwright tests passed | *Figure X: Playwright end-to-end test run against the Vite dev server.* |
| **D** | Optional: `npx playwright show-report` (after e2e) — HTML report overview | *Figure X: Playwright HTML report summary.* |
| **E** | Optional: browser window showing `/login?mode=signup` with “Create Account” (manual or during `test:e2e:ui`) | *Figure X: Sign-up mode opened via query string, consistent with automated e2e checks.* |

**Tips:** use a readable font size in the terminal; crop to the relevant block; blur any secrets if you paste `.env` by mistake (do not include `.env` in screenshots).

---

## 3. Executed automated checks (inventory)

### 3.1 Vitest — unit tests (`tests/unit/`, `tests/functions/`)

| Area | File | What is asserted (short) |
|------|------|---------------------------|
| Vote score | `tests/unit/voteScoreDelta.test.ts` | All transitions `null`/`up`/`down` → correct score delta |
| Comment tree | `tests/unit/commentTree.test.ts` | Nesting, sort order, orphan replies; tree count |
| Feed card mapping | `tests/unit/threadToPostCardPost.test.ts` | `feed` vs `default` community id resolution |
| Locations | `tests/unit/communityLocations.test.ts` | Unique ids; map matches list |
| Spam (client) | `tests/unit/moderationSpam.test.ts` | Keywords/URLs flagged; normal text not flagged |
| Flash countdown | `tests/unit/useFlashCountdown.test.tsx` | `null` when no flash; `"Expired"` when past expiry |
| Credibility (Functions) | `tests/functions/credibility.test.ts` | Score bounds; rejected ceiling; model version; serialisation |

### 3.2 Vitest — integration (`tests/integration/`)

| File | What is asserted |
|------|------------------|
| `app-auth-routing.test.tsx` | Unauthenticated `/feed` → login heading; `/` → landing hero “Irish Students” |

### 3.3 Playwright — e2e (`tests/e2e/`)

| File | What is asserted |
|------|------------------|
| `landing.spec.ts` | Hero contains “Irish Students”; “Explore Communities” link visible |
| `auth-gate.spec.ts` | `/feed` → URL `/login` + “Log In” heading; `/login?mode=signup` → “Create Account” |

**Totals (as implemented):** **24** tests via Vitest; **4** tests via Playwright.

---

## 4. Code snippets for the report (copy from repo)

Use **syntax-highlighted** code blocks in the thesis; cite **file path** in the caption or text.

| Topic | File | Lines (approx.) | Note |
|-------|------|-----------------|------|
| Vitest in Vite | `vite.config.ts` | 8–17 | `test`: jsdom, `setupFiles`, `include`, `coverage` |
| Test setup | `tests/setup.ts` | 1 | jest-dom matchers |
| Example unit test | `tests/unit/voteScoreDelta.test.ts` | 1–26 | Classic arrange/act/assert pattern |
| Integration test | `tests/integration/app-auth-routing.test.tsx` | 7–49 | `AuthContext` + `MemoryRouter` + `App` |
| Playwright config | `playwright.config.ts` | 7–24 | `webServer`, `baseURL`, Chromium |
| E2E auth / signup | `tests/e2e/auth-gate.spec.ts` | 1–14 | Redirect + query string |
| E2E landing | `tests/e2e/landing.spec.ts` | 1–15 | Public page checks |
| NPM scripts | `package.json` | `scripts` block | `test`, `test:run`, `test:coverage`, `test:e2e` |

For a **credibility** snippet, cite `tests/functions/credibility.test.ts` (expectations on score range and rejected content), not only `functions/src/credibility.ts` (longer).

---

## 5. One paragraph you can paste under “Execution / Results”

*All automated checks were executed on the development machine from the repository root. Unit and integration tests were run with `npm run test:run` using Vitest; coverage was optionally collected with `npm run test:coverage`. End-to-end tests were executed with `npm run test:e2e` after installing the Chromium browser for Playwright (`npx playwright install chromium`). The recorded outcomes are shown in Figures […].*

Replace “Figures […]” with your figure numbers.

---

## 6. Package versions (optional footnote)

Record actual versions from `package.json` when the thesis is finalised, e.g. `vitest`, `@playwright/test`, `@testing-library/react`, `vite`.
