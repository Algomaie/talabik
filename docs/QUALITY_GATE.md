# Executed quality gate

Date: 31 October 2026, Asia/Riyadh. Results refer to this local working branch. The owner subsequently authorized publishing it to GitHub; the results below remain the observed local review evidence. A command is not marked PASS merely because it was added to CI. Commands below are run from repository root unless stated otherwise. PowerShell command groups may have a final shell exit code from their last command; the individual tool output was inspected for each reported result.

## Final observed results

| Check / command | Result | Evidence / limit |
| --- | --- | --- |
| `npm ci --prefix backend --no-audit --no-fund` | PASS at baseline | 281 packages installed; subsequent security changes installed with npm install/audit fix, not a final clean-clone backend ci |
| `npm ci --prefix frontend --include=dev --no-fund --no-audit` | PASS after retry | Initial retry failed EPERM because Vite held native binding; stopped the task-owned process and reran successfully |
| `npm run typecheck --prefix frontend` | PASS | Explicit tsc -b check, plus latest build repeated TypeScript compilation |
| `npm run build --prefix frontend` | PASS | Latest output: Vite 8.3.1, JS 518.28 kB / gzip 139.82 kB; chunk size and ineffective dynamic-import warnings remain |
| `npm run lint --prefix frontend` | PASS with warnings | Oxlint exits 0; hook dependencies/initialization and effect/refresh warnings remain. Final Cart edits compiled; lint was last run before those small contract edits |
| `npm test --prefix frontend` | PASS | **6 tests / 4 files**: Auth 2, Stores 2, Products 1, Cart 1. The Stores failure test intentionally logs its simulated offline error |
| `npm run typecheck --prefix backend` | PASS | tsc --noEmit; subsequent final build also checks types |
| `npm run build --prefix backend` | PASS | Latest tsc completed after final backend cleanup |
| `npm run lint --prefix backend` | PASS | Latest Oxlint command completed without warnings after cleanup |
| `npm test --prefix backend` | PASS | **15 tests / 3 files**: API 6, order regressions 4, production cache outage policy 5. Last run preceded import-only cleanup |
| `npm run migrate --prefix backend` with isolated DATABASE_URL | PASS | Eleven up migrations applied to new local PostgreSQL 18 database `talbak_test`, port 55432 |
| `ALLOW_DEMO_SEED=true npm run seed --prefix backend` (PowerShell env equivalent) | PASS for initial seed | Local demo users/store/categories/products/address created. Later non-reset/idempotence refinements were built but not rerun |
| `npm run test:integration --prefix backend` with TEST_DATABASE_URL | PASS for PostgreSQL | **2 tests**: concurrent checkout/replay/cancel; merchant → driver lifecycle and duplicate-completion earnings protection |
| Real Redis session test in integration suite | SKIPPED | TEST_REDIS_URL absent, Redis unavailable. This is not PASS |
| `docker --version`, Compose services | UNAVAILABLE | Docker executable absent; Compose was edited/reviewed but not executed |
| `wsl --status` | UNAVAILABLE for Redis | WSL reported virtualization/platform prerequisites unavailable; no system features were changed |
| Browser login/dashboard/orders/products/admin smoke | PASS within scope | Installed Edge + bundled Playwright; real API/DB, no API interception; Redis development fallback. Product crash found, fixed and recaptured |
| Browser login at 390×844 | PASS within scope | No horizontal document overflow; not a complete mobile audit |
| Final full browser Cart checkout | NOT RUN | Automatic approval review could not execute the command due to review usage limit. DOM Cart + REST/PostgreSQL flow tests passed independently |
| `npm audit --prefix backend --omit=dev --json` | PASS: zero reported | Before fixes: 4 production findings; after compatible patches and Zod 4.6.7: 0. No claim about all possible vulnerabilities |
| `npm audit --prefix frontend --omit=dev --json` | PASS: zero reported | Before fix: 1 production finding; after follow-redirects patch: 0 |
| Current-tree private-key/token pattern scan using `rg -l` | No matches | Excluded .git, .local, node_modules, dist and actual ignored .env; printed no secret values. Not a history scan |
| `git ls-files '*env*'` | Reviewed | Only backend example tracked at that moment; new root/frontend examples are untracked intended additions. Actual backend .env ignored |
| `git diff --check` | PASS before publication | Initial whitespace/EOF findings were corrected; complete `git -c core.autocrlf=false diff --check` returned no findings in the publication pass |
| GitHub Actions hosted run | NOT RUN | Workflow exists; no push performed |
| README/documentation relative-link automated scan | PASS before publication | Nine Markdown documents checked; no missing relative file links found. Anchor targets were not validated |

## Failed checks that led to fixes

1. **Frontend build:** unused imports and nested delivery type mismatch. Fixed without disabling compiler checks; later builds passed.
2. **Backend lint:** called uninstalled ESLint. Replaced with configured Oxlint; final command passed.
3. **First PostgreSQL integration attempt:** test expected cart addition HTTP 200; existing API correctly returned 201. Corrected test to contract and used new test users for repeatable isolation; subsequent suite passed.
4. **Products browser page:** `categories.find is not a function`. Corrected nested category response; browser recapture and regression test passed.
5. **First Products regression-test attempt:** factory mock state was reset by test configuration. Set responses inside the test; rerun passed.
6. **Frontend reinstallation:** EPERM while running Vite held native module. Stopped only task-owned Node processes, then npm ci passed.
7. **Dependency audit:** fixed reported body-parser/qs/fast-uri/follow-redirects findings; upgraded vulnerable Zod and adjusted error handling. Final production scans reported zero.

## Verification environment and retained local state

- PostgreSQL cluster was newly initialized under ignored `.local/pg-readiness`; random password is stored locally in ignored `.local/pg-password` and never documented or committed.
- No existing database was wiped and no down migration was run. Tests retain their newly created test records.
- Backend and Vite were started as hidden local processes for screenshots (last recorded PIDs: API 17180, Vite 23732). PostgreSQL also remains local. Confirm current processes before stopping; do not kill unrelated Node processes.
- Screenshot API used development fallback because Redis was absent. Production configuration is stricter and should not be inferred from those screenshots.
- The terminal sandbox failed to start processes; elevated execution worked until automatic-review usage was exhausted. The later browser checkout command was not executed and was not retried through another route.

## Finish before deployment / owner handoff

Run the final clean-clone installation, complete Compose startup, real Redis integration, revised seed rerun, final Git/link review and full browser checkout. CI must run on the actual pushed branch after owner approval. Complete personal contribution confirmations. No deployment or push approval is implied by this document.
