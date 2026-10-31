# Recruitment-readiness change map

This is a review navigation map, not an authorship claim. Twelve frontend files had pre-existing uncommitted changes. The owner subsequently authorized committing and publishing the prepared branch. Historical commits were not rewritten. Review the branch diff for exact lines and review the pre-existing changes separately.

## Frontend

- `frontend/package.json`, `frontend/package-lock.json`: test tooling, commands and security lockfile updates.
- `frontend/vitest.config.ts`, `frontend/tests/setup.ts`: DOM test configuration.
- `frontend/tests/Auth.test.tsx`, `StoresPage.test.tsx`, `MerchantProducts.test.tsx`, `Cart.test.tsx`: form, REST states, API-envelope regression and checkout retry/total tests.
- `frontend/.env.example`, `frontend/README.md`: API URL and frontend instructions.
- `frontend/src/context/AuthContext.tsx`: camelCase auth user contract.
- `frontend/src/components/AppLayout.tsx`: route role checks and unused import cleanup.
- `frontend/src/lib/api.ts`: shared refresh promise, no refresh loop for login endpoints, checkout key and driver transit method.
- `frontend/src/pages/auth/LoginPage.tsx`: accessible error/password controls and development-only demo shortcuts.
- `frontend/src/pages/customer/StoresPage.tsx`: explicit load error/retry.
- `frontend/src/pages/customer/StoreDetailsPage.tsx`: nested categories response.
- `frontend/src/pages/customer/CartPage.tsx`: nested cart response, item/subtotal/fee/VAT fields, load error and stable checkout key.
- `frontend/src/pages/customer/CustomerOrdersPage.tsx`: unused import cleanup over pre-existing edits.
- `frontend/src/pages/dashboard/DashboardPage.tsx`: admin order endpoint, dates, earnings envelope and unused imports.
- `frontend/src/pages/driver/DriverDeliveriesPage.tsx`: correct driver transit API and unused import cleanup.
- `frontend/src/pages/driver/DriverHistoryPage.tsx`: delivery type, earnings and order-detail envelope.
- `frontend/src/pages/merchant/MerchantProductsPage.tsx`: nested categories response.
- `frontend/src/pages/merchant/MerchantCategoriesPage.tsx`: nested stores/categories/create responses.
- `frontend/src/pages/merchant/MerchantOrdersPage.tsx`, `MerchantStoreSettingsPage.tsx`: unused imports/bindings over existing edits.
- `frontend/src/pages/shared/ProfilePage.tsx`: nested profile response and unused bindings.
- `frontend/src/pages/admin/AdminUsersPage.tsx`, `AdminOrdersPage.tsx`, `AdminMerchantsPage.tsx`, `AdminDriversPage.tsx`: pagination `meta` contract; AdminOrders also unused import cleanup.

## Backend

- `backend/package.json`, `backend/package-lock.json`: Express 4 types, Oxlint, test/typecheck commands, Zod/security updates.
- `backend/.env.example`: frontend CORS origin and placeholder local DB password.
- `backend/seed-products.js`: remove hardcoded database password; environment and seed opt-in.
- `backend/src/app.ts`: import-safe startup and bounded request bodies.
- `backend/src/config/index.ts`: required/nonempty environment and production JWT checks.
- `backend/src/common/constants/cache-keys.ts`: page size and sort in keys.
- `backend/src/common/middleware/auth.middleware.ts`: current account/roles check.
- `backend/src/common/middleware/error-handler.middleware.ts`: malformed/oversized body responses and headers-sent delegation.
- `backend/src/common/middleware/rate-limiter.middleware.ts`: preserve security-store 503 failures.
- `backend/src/common/middleware/validation.middleware.ts`: Zod 4 issue compatibility.
- `backend/src/database/migrate.ts`: import guard, declaration exclusion and extension-normalized migration identity.
- `backend/src/database/seed.ts`: non-production opt-in; preserve passwords/inventory and avoid duplicate default address.
- `backend/src/database/migrations/011_order_number_sequence.ts`: additive concurrency-safe order numbering.
- `backend/src/modules/orders/orders.service.ts`, `orders.repository.ts`, `orders.routes.ts`, `orders.validation.ts`: replay ownership, snapshot checks, address ownership, status concurrency and atomic cancellation/restocking.
- `backend/src/modules/cart/cart.service.ts`: read results after transaction commit.
- `backend/src/modules/deliveries/deliveries.routes.ts`: ready/approved checks and atomic lifecycle updates/earnings.
- `backend/src/modules/admin/admin.routes.ts`: validate administrative mutations.
- `backend/src/modules/ratings/ratings.routes.ts`: enforce target/order relationship.
- `backend/src/modules/stores/stores.service.ts`, `products/products.service.ts`: correct cache keys/filter detection.
- `backend/src/modules/auth/auth.service.ts`: atomic refresh consumption and token-derived TTL.
- `backend/src/redis/client.ts`, `cache.service.ts`: fail fast when offline, production session-store policy, GETDEL and fixed-window atomic counters.
- Auth controller, addresses routes, drivers routes and categories service: unused import cleanup.
- `backend/vitest.config.ts`, `vitest.integration.config.ts`, `backend/tests/`: API, business/security regressions and real PostgreSQL/optional Redis integration.

## Operations and documentation

- `.gitignore`: ignore isolated `.local/` verification data.
- `.env.example`, `docker-compose.yml`: external local password and loopback-only service ports.
- `.github/workflows/ci.yml`: separate frontend/backend jobs and PostgreSQL/Redis services.
- `README.md`, `frontend/README.md`: accurate installation, environment, running/testing and limitations.
- `docs/TECHNICAL_AUDIT.md`, `QUALITY_GATE.md`, `API_REFERENCE.md`, `ASSESSMENT_PREPARATION.md`, `RECRUITMENT_SHOWCASE.md`, this map, and real screenshots/capture instructions.

Local `.local/` cluster, credentials, logs and scripts are ignored verification state, not intended repository deliverables. Staged whitespace and documentation relative file-link checks passed in the publication pass; consult the quality gate for other limits.
