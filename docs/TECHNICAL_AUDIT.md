# Technical audit — Talabak recruitment readiness

The [security follow-up](SECURITY_REVIEW.md) supersedes the original review for dependency versions, session revocation, account approval and driver acceptance concurrency. Its full dependency audit includes development tools.

The subsequent [localization follow-up](LOCALIZATION.md) adds Arabic/English interfaces, RTL, persisted language selection and automated interaction tests. Earlier references below to an English-only UI describe the original audit baseline. Offline IndexedDB submission/synchronization remains unimplemented.

Review date: **31 October 2026 (Asia/Riyadh)**. Working branch: `chore/recruitment-readiness`. This report describes local evidence, not a production certification. The owner subsequently authorized publishing the branch to GitHub. No public application deployment was made.

## Scope and repository baseline

The repository contains separate `frontend/` and `backend/` npm packages, a local-services Compose file, requirements/architecture Markdown, and initially no executable test files or GitHub workflow. There is no root `package.json`, root `tsconfig.json`, application Dockerfile, IndexedDB queue or Arabic form implementation.

The file inventory, package manifests/lockfiles, TypeScript configs, routing, authentication, domain services/repositories, migrations, seed, Redis helpers and frontend pages were inspected through file listings, targeted source review, compiler/linter checks, tests and browser execution. This is not a claim that every branch in every source file has been executed or formally security-audited.

Twelve frontend files already had uncommitted modifications before this work: `lib/api.ts`; customer Cart, Orders, StoreDetails and Stores pages; Dashboard; driver Deliveries and History; merchant Orders, Products and StoreSettings; shared Profile. These were retained. The final Git diff includes those original changes and must not be attributed entirely to this review.

Git reported different Windows ownership. Commands used a per-command `safe.directory` override, not a global trust setting. Git created the requested branch reference but could not atomically replace existing metadata due to ACLs. `HEAD` was pointed to that already-created branch in place; no commit history was changed. Normal commit/index operations may still require the owner to repair the checkout's Windows permissions.

## Actual technology versions

| Component | Lockfile/runtime evidence |
| --- | --- |
| Runtime | Node 24.22.1, npm 11.19.1 |
| React / Router | 19.3.0 / 7.18.4 |
| Frontend TypeScript / Vite | 6.0.3 / 8.3.1 |
| Backend TypeScript / Express | 5.9.3 / 4.22.3 |
| PostgreSQL client / Redis client | pg 8.23.0 / ioredis 5.11.1 |
| Validation | Zod 4.6.7 after security upgrade |
| Tests | Vitest 5.0.5, Testing Library React 16.3.3, Supertest 7.3.0 |
| Services | Compose specifies PostgreSQL 16/Redis 7; local database tests ran on PostgreSQL 18 |

Express runtime 4 previously used Express 5 types; types now match Express 4. React Query is installed but the current pages primarily use local React state and Axios; its presence is not evidence that React Query manages their data. Unused Swagger dependencies were removed in the security follow-up; no Swagger UI endpoint is mounted.

## Findings and actions

| Priority | Finding and impact | Action taken | Verification |
| --- | --- | --- | --- |
| P0 | Frontend did not build: unused imports and missing nested delivery type | Removed actual unused bindings and corrected type | Frontend typecheck/build passed |
| P0 | Auth API returns camelCase while AuthContext read snake_case; user names disappeared | Corrected mapping for login/register/me | React auth test and actual browser login |
| P0 | Products page treated `{ categories }` as an array and crashed at `.find` | Extracted categories; corrected merchant categories and store details contracts | Browser reproduced then no longer reproduced; regression test passed |
| P0 | Cart read `{ cart }` as the cart; item prices/subtotal were wrong; delivery fee hardcoded and VAT omitted | Corrected nested fields; read store fee; aligned subtotal/VAT calculation; explicit load failure | Cart DOM test passed, total 20 + 5 + 3 = 28; full browser checkout remains pending |
| P0 | Idempotency replay could disclose another customer's order | Check owner and request address/notes before returning replay; validate header length before service | Security regression and real PostgreSQL replay/conflict tests |
| P0 | Daily count-based order numbers collided under concurrency | Additive sequence migration and wider order-number column | Applied migration and concurrent checkout test |
| P0 | Cancellation set stock to -1 before increment, violating inventory integrity; merchant rejection became CANCELLED | Conditional status update + exact restock in same transaction; merchant returns REJECTED | Concurrent cancellation integration confirms exactly one success and exact restoration |
| P0 | Order status writes could overwrite concurrent changes | Expected-status condition with 409 on stale state | Repository regression and integration |
| P0 | Driver could accept a non-ready order; completion could credit earnings twice | Require ready order/approved driver; atomic state checks and transactions for pickup/transit/complete | Real PostgreSQL full lifecycle and simultaneous completion: earnings increment once |
| P0 | Checkout did not verify address ownership | Owner-scoped address query; revalidate cart/product snapshot and active store | Covered by code review and successful checkout; dedicated foreign-address browser case not run |
| P0 | Merchant without profile bypassed order ownership check | Explicit denial; assigned drivers can read their own order only | Unit regression and driver order access integration |
| P0 | Authenticated requests trusted stale account/role claims | Check current database user activity and roles | API/DB suites passed; dedicated suspension mutation test still desirable |
| P0 | Fixed DB password in legacy seed and Compose configuration | Legacy seed reads environment; Compose requires supplied password and binds loopback | Source scan; Compose runtime unavailable locally |
| P0 | Dependency scan reported 4 backend and 1 frontend production vulnerabilities | Compatible transitive fixes; Zod upgrade with `issues` compatibility change | Final `npm audit --omit=dev`: zero reported for both; builds/tests passed |
| P0 | Redis failures could bypass revocation/rate limiting in production | Production startup requires Redis; security operations fail with 503; optional catalog cache can fall back | Five outage-policy unit tests; real Redis test skipped locally |
| P1 | Refresh token get/delete race and concurrent browser refresh requests | Atomic Redis GETDEL; one shared frontend refresh promise; TTL follows JWT expiry | Builds/API tests; real Redis concurrency test authored but not run locally |
| P1 | Cart service returned data through another connection before transaction commit | Read cart after transaction resolves | PostgreSQL test verifies returned item is present |
| P1 | Cache keys omitted page size/sort and mishandled zero-valued filters | Include limit/sort; cache only unfiltered queries | Build/static verification; no local Redis cache integration result |
| P1 | Driver UI called merchant-only order status API | Call driver transit endpoint; fix earnings and order-detail envelopes | Frontend build; matching driver API lifecycle test |
| P1 | Admin pagination used `pagination` instead of actual `meta`; profile used wrong envelope | Corrected consumers; admin recent orders use admin endpoint | Build; admin page browser smoke; not every admin mutation tested |
| P1 | Admin mutation bodies lacked validation; rating target could refer to unrelated entity | Zod status/boolean validation; rating target must belong to delivered order | Build/API validation coverage; dedicated rating integration pending |
| P1 | Backend test import started real server; lint called missing ESLint | Main-module startup guard; Oxlint command; Vitest configs and real tests | Tests/build/lint executed |
| P1 | Malformed JSON became 500; large body allowance unnecessary | 400 for invalid JSON, 413 for oversized body, 100kb request bounds | API malformed-JSON test passed |
| P1 | Seed reset passwords/stock and duplicated default addresses | Explicit opt-in/non-production guard; preserve existing passwords/stock; avoid duplicate Home address | Initial seed passed; revised seed rerun/idempotence still pending |
| P1 | Compiled migration discovery included declaration files and used different extension identities | Exclude `.d.ts`, normalize `.ts`/`.js` migration identity | Build passed; compiled/source cross-run not executed |
| P1 | README claimed production grade and omitted React setup | English README, frontend guide, audit, showcase, evidence, API reference and assessment plan | Documentation/source consistency review; nine-document relative file-link scan passed |
| P1 | No CI quality workflow | Frontend and backend jobs; PostgreSQL/Redis services for integration | Local commands exercised; GitHub-hosted workflow not run |

## Frontend assessment

Components, role-specific pages, Router, authentication context and responsive sidebar exist. Login and role route guards are implemented; server-side checks remain authoritative. Stores is the clearest bounded React/REST example: loading → error/retry or results → client search/empty state. Tests exercise these transitions. Cart tests verify actual API envelopes, displayed totals and retry key stability. Demo-login buttons are development-only and password visibility has an accessible label.

Browser execution verified login, customer dashboard, customer orders, merchant products and admin users with actual HTTP requests and PostgreSQL. Screenshots are real; Redis was unavailable and the API used its documented development fallback. At 390px, the login page had no horizontal overflow. This is not full responsive/accessibility certification. Most UI copy is English; no existing Arabic interface was found to certify RTL behavior.

## Database and API assessment

Migrations define users/roles/permissions, merchants, stores, drivers, products/inventory, carts/addresses, orders/items, deliveries/payments, notifications/ratings/audit tables. Foreign keys, unique keys, quantity/status checks and relevant owner/status indexes exist. Values are parameterized; dynamic sort/column choices use internal allowlists. The pool has bounded connection count and timeouts; transaction helper rolls back and releases clients.

Eleven up migrations and initial seed completed against a newly created isolated `talbak_test` database on loopback port 55432. No existing database or volume was deleted. Integration tests create their own users/addresses/orders and retain their test records. They explicitly mock Redis; a PostgreSQL test is not evidence of functioning Redis sessions.

Cash/payment rows are a demonstration model. Merchant confirmation no longer falsely marks cash payment collected. No gateway, webhook, reconciliation or financial compliance claim is made.

## Remaining issues and limits

| Severity | Remaining issue | Consequence / next action |
| --- | --- | --- |
| High for deployment | Redis and Compose could not be executed here; hosted CI not run | Run the real Redis test and the complete Compose fresh-clone workflow before deployment |
| High for deployment | Tokens in localStorage; no cookie/CSRF redesign | XSS can expose sessions; assess cookie sessions and CSP before public rollout |
| Medium | User creation/role is transactional, role-specific profile creation is separate | A failed merchant/driver profile insert can leave a partial registration; combine in a transaction with dedicated tests |
| Resolved in security follow-up | Concurrent acceptance of different jobs by one driver | Driver-row locking and BUSY availability enforcement added; real PostgreSQL concurrency test passed |
| Medium | Migration DDL and ledger insert are separate; no global migration lock | Crash/concurrent deploy recovery needs transactional runner and operator procedure |
| Medium | Many pages use `any`, console-only failures, broad fallbacks and mixed API naming conventions | Improve endpoint types and bounded error states incrementally; do not imply every page mutation is verified |
| Partly resolved in security follow-up | Password changes and logout now revoke sessions through database token versions | Real PostgreSQL tests pass with a session-store double; real Redis integration is separately exercised in CI |
| Medium | No full browser checkout after final Cart fixes | DOM + real API/DB suites pass independently; final browser request was blocked by automatic-review usage limit |
| Low | React hook/lint warnings remain; frontend bundle about 518 kB minified | Address effect dependencies/race cleanup and route splitting after correctness work |
| Operational | Git metadata owned by a different Windows SID | Owner may need to repair ACLs before normal commit/index operations; no global permission changes were made |
| Ownership | Personal contribution scope unconfirmed | Complete `[OWNER CONFIRMATION REQUIRED]` sections before sending an authorship claim |

The current-tree secret-pattern scan found no private-key/AWS/GitHub/OpenAI-token pattern matches outside excluded local/generated directories. `backend/.env` is ignored and was not tracked. Local example/demo/test credentials are explicitly labeled. This scan is not a historical secret audit: the removed legacy password may remain in old commits. If it ever protected a real service, rotate it; history was intentionally not rewritten.

## Readiness judgement

Suitable for a technical portfolio walkthrough **with the disclosed limitations**: React and REST behavior, real PostgreSQL persistence, concurrency regressions and automated tests are demonstrable. Public deployment readiness is not established. The Arabic offline assessment remains a preparation document, not an implemented deliverable.

See [QUALITY_GATE.md](QUALITY_GATE.md) for executed commands, failures/fixes and pending checks.
