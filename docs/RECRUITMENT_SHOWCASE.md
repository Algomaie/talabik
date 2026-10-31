# Talabak — Full-Stack Delivery Platform

**Frontend:** React, TypeScript. **Backend:** Node.js, Express, TypeScript. **Database:** PostgreSQL. **Supporting service:** Redis for catalog caching, sessions/revocation and rate limiting.

The evidence is executable code and tests. This is a portfolio implementation with limitations, not a claim of production scale or implementation of the employer's Arabic offline assessment.

## Evidence map

| Skill | Direct code evidence |
| --- | --- |
| React REST states | [StoresPage](../frontend/src/pages/customer/StoresPage.tsx), [tests](../frontend/tests/StoresPage.test.tsx) |
| Form interaction | [LoginPage](../frontend/src/pages/auth/LoginPage.tsx), [Auth tests](../frontend/tests/Auth.test.tsx) |
| Auth and routing | [AuthContext](../frontend/src/context/AuthContext.tsx), [Axios](../frontend/src/lib/api.ts), [AppLayout](../frontend/src/components/AppLayout.tsx) |
| Dashboard/admin | [Dashboard](../frontend/src/pages/dashboard/DashboardPage.tsx), [Admin users](../frontend/src/pages/admin/AdminUsersPage.tsx) |
| API security | [Express](../backend/src/app.ts), [auth middleware](../backend/src/common/middleware/auth.middleware.ts), [RBAC](../backend/src/common/middleware/rbac.middleware.ts) |
| Transactions | [Order service](../backend/src/modules/orders/orders.service.ts), [repository](../backend/src/modules/orders/orders.repository.ts) |
| PostgreSQL | [Order schema](../backend/src/database/migrations/008_create_orders.ts), [sequence](../backend/src/database/migrations/011_order_number_sequence.ts), [pool](../backend/src/config/database.ts) |
| Verification | [API tests](../backend/tests/api.test.ts), [regressions](../backend/tests/orders.test.ts), [real database checkout](../backend/tests/checkout.integration.test.ts) |
| CI | [GitHub workflow](../.github/workflows/ci.yml) |

## My Contributions

These are owner-editable drafts, not verified authorship claims:

- [OWNER CONFIRMATION REQUIRED] My role in original React pages, API modules and schema design was: ______.
- [OWNER CONFIRMATION REQUIRED] Components I personally implemented and can explain line by line: ______.
- [OWNER CONFIRMATION REQUIRED] Team context, dates, responsibility boundaries and any production usage: ______.
- This working branch contains AI-assisted readiness fixes and tests. Review its diff and disclose assistance accurately. Twelve frontend files had pre-existing uncommitted edits; they were preserved and are not attributed to this review or any individual without confirmation.
- Historical commits were not rewritten or invented. No deployment metrics are asserted.

## How to Evaluate This Project in 10 Minutes

Assumes dependencies and PostgreSQL/Redis are available. A cold clone/service download may take longer.

1. **0–2 minutes:** Follow [setup](../README.md#local-installation), migrate, enable local demo seed, start backend/frontend.
2. **2–4:** Login as customer; browse/search stores, add a product, checkout with a local address. Inspect actual REST requests in Network tools.
3. **4–5:** Login as merchant to inspect Products/Orders, then admin to inspect dashboard/users. Consult the audit for actual verification scope.
4. **5–7:** Run `npm test --prefix frontend` and `npm test --prefix backend`.
5. **7–9:** On a separate seeded `_test` database set `TEST_DATABASE_URL`, then run `npm run test:integration --prefix backend`. Review duplicate suppression and exact restocking assertions.
6. **9–10:** Read [quality results](QUALITY_GATE.md) and [remaining risks](TECHNICAL_AUDIT.md). Discuss transaction boundaries and the difference between screenshots and concurrency proof.

## Suggested recruiter message

> I’m sharing Talabak, a React/TypeScript and Node.js/Express delivery-platform project backed by PostgreSQL. It includes frontend interaction tests, REST API tests, a PostgreSQL checkout integration test, setup instructions and a technical audit. The showcase links directly to the relevant code. I can walk through the architecture, tests and documented limitations. My exact contribution scope is available on request.

Send a link to the branch/commit containing these changes only after approval to push. Confirm the contribution section before representing the work as solely your own.
