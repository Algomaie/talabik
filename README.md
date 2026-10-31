# Talabak — Full-Stack Delivery Platform

Talabak (named `talbak` in source packages) demonstrates **React + TypeScript**, a **Node.js / Express REST API**, and **PostgreSQL persistence**. Customers browse stores and place orders; merchants manage products and preparation; drivers handle deliveries; administrators manage accounts and statistics.

This is a portfolio implementation, not a production-readiness certification. Read the [technical audit](docs/TECHNICAL_AUDIT.md), [executed checks](docs/QUALITY_GATE.md), and [recruitment showcase](docs/RECRUITMENT_SHOWCASE.md). The Arabic offline form is a separate [assessment preparation exercise](docs/ASSESSMENT_PREPARATION.md), not a feature already implemented here.

## Implemented features

- React Router, [AuthContext](frontend/src/context/AuthContext.tsx), role-aware layout and customer/merchant/driver/admin pages.
- [StoresPage](frontend/src/pages/customer/StoresPage.tsx): REST loading, error/retry, successful results, search and empty states, with [interaction tests](frontend/tests/StoresPage.test.tsx).
- JWT access/refresh authentication, Argon2 passwords, Zod validation, role and resource ownership checks.
- PostgreSQL migrations, foreign keys, inventory constraints, connection pooling and transactions.
- Checkout idempotency, conditional stock reservation and transactional cancellation/restocking.
- Redis catalog caching, refresh session consumption, token revocation and rate limiting.
- Vitest, React Testing Library, Supertest and real PostgreSQL integration tests.

## Tech stack

| Layer | Locked versions during this review |
| --- | --- |
| Frontend | React 19.3, TypeScript 6.0, Vite 8.3, React Router 7.18, Axios 1.20 |
| Backend | Express 4.22, TypeScript 5.9, Zod 4.6, pg 8.23, ioredis 5.11 |
| Services | Compose: PostgreSQL 16 and Redis 7; local integration: PostgreSQL 18 |
| Verification | Node 24.22, Vitest 5.0, Testing Library, Supertest, Oxlint |

Exact versions are in package lockfiles. Use **Node 24 LTS** for this workflow; older Node versions have not been verified with the frontend toolchain.

## Architecture

```text
React + Router + AuthContext
          | Axios / JSON / Bearer JWT
          v
Express routes -> validation/auth/RBAC -> services -> repositories
                                           |              |
                                         Redis       PostgreSQL pool
```

## Project structure

```text
frontend/src/{components,context,lib,pages}  React application
frontend/tests/                            DOM interaction tests
backend/src/modules/                       Domain routes/services/repositories
backend/src/common/                        Middleware/errors/utilities
backend/src/database/migrations/           Ordered schema changes
backend/src/database/seed.ts               Opt-in local demo data
backend/tests/                             API/regression/integration tests
docker-compose.yml                         Local PostgreSQL + Redis
.github/workflows/ci.yml                    Build/types/lint/tests
docs/                                      Audit, showcase and evidence
```

There is no root package.json, root tsconfig or application Dockerfile. Install/run frontend and backend separately.

## Screenshots

![Actual local login page](docs/screenshots/login.png)

See [capture evidence and instructions](docs/screenshots/README.md). Images are actual application captures, not mockups; they do not certify every workflow.

[Dashboard](docs/screenshots/dashboard.png) · [Products](docs/screenshots/products.png) · [Orders](docs/screenshots/orders.png) · [Admin users](docs/screenshots/admin-panel.png)

## Local installation

Prerequisites: Git, Node 24, npm and Docker Compose with a working engine, or separate PostgreSQL and Redis installations.

```sh
git clone https://github.com/Algomaie/talabak.git
cd talabak
npm ci --prefix backend
npm ci --prefix frontend
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

PowerShell also supports `Copy-Item`. **Do not overwrite existing environment files.** Edit newly copied files:

| File / variable | Local value |
| --- | --- |
| Root `.env`: `POSTGRES_PASSWORD` | Your generated local password |
| Backend `DATABASE_URL` | `postgresql://talbak:YOUR_URL_ENCODED_PASSWORD@localhost:5432/talbak` |
| Backend `REDIS_URL` | `redis://localhost:6379` |
| Backend `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Two different random values, generated below |
| Backend `CORS_ORIGIN` | `http://localhost:5173` |
| Backend `PORT`, `NODE_ENV` | `5000`, `development` |
| Frontend `VITE_API_URL` | `http://localhost:5000/api/v1` |

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
docker compose up -d
npm run migrate --prefix backend
```

Run the random-value command separately for each secret. Compose binds services to loopback and preserves volumes. Changing its password variable does not change an existing database's password. Do not delete volumes to work around credentials.

Enable seed only for a disposable local database:

```sh
# bash
ALLOW_DEMO_SEED=true npm run seed --prefix backend
```

```powershell
# PowerShell
$env:ALLOW_DEMO_SEED = 'true'
npm run seed --prefix backend
Remove-Item Env:ALLOW_DEMO_SEED
```

Run each in its own terminal:

```sh
npm run dev --prefix backend
```

```sh
npm run dev --prefix frontend -- --port 5173 --strictPort
```

Open [frontend](http://localhost:5173) and [API health](http://localhost:5000/health). Health is process liveness, not service readiness. Keep hostname consistent: `localhost` and `127.0.0.1` are different CORS origins.

## Account approval and session updates

New merchant and driver registrations stay pending until an administrator approves them. Seeded demo profiles are already approved. After updating to the security follow-up, run all migrations (including 012) and sign in again: old token formats are rejected. Password changes and logout revoke all existing sessions. See [Security review](docs/SECURITY_REVIEW.md) and [Security policy](SECURITY.md).

## Local demo accounts

Initial password: `Demo@1234`. These are public **local demo credentials**, never production credentials. Production rejects seed; frontend production builds hide demo shortcuts. Re-seeding preserves existing passwords and inventory, but maintains demo catalog/profile records: always use a dedicated demo database.

| Role | Email | Try |
| --- | --- | --- |
| Customer | customer@talbak.com | Stores → products → cart → checkout → orders |
| Merchant | merchant@talbak.com | Products and preparation |
| Driver | driver@talbak.com | Deliveries and history |
| Admin | admin@talbak.com | Dashboard and account management |

## API documentation

[API reference](docs/API_REFERENCE.md). Responses use `{ success, data }`; paginated responses put arrays in `data` and metadata in `meta`. Auth user fields are camelCase; some admin/delivery endpoints return snake_case. Source routes are authoritative. The route files document the actual API; unused Swagger dependencies have been removed.

## Automated testing

```sh
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm test --prefix frontend
npm run build --prefix frontend
npm run typecheck --prefix backend
npm run lint --prefix backend
npm test --prefix backend
npm run build --prefix backend
```

For integration, create a separate database whose name ends in `_test`. Set both `DATABASE_URL` and `TEST_DATABASE_URL` to it, run migrations and demo seed, then:

```sh
npm run test:integration --prefix backend
```

Checkout tests use real PostgreSQL and explicitly mock Redis. Set `TEST_REDIS_URL` to a separate test Redis to run its session test; otherwise it is reported as skipped. Tests retain new test users/orders and never clean up existing data. [Quality evidence](docs/QUALITY_GATE.md) distinguishes executed checks from pending checks. CI provisions PostgreSQL/Redis; no hosted CI result is claimed before a push/run.

## Build and deployment considerations

```sh
npm run build --prefix backend
npm run build --prefix frontend
npm start --prefix backend
npm run preview --prefix frontend
```

Preview uses port 4173 by default; adjust backend CORS for that local origin. Deployment requires HTTPS, private service networking, generated secrets, SPA fallback for `frontend/dist`, and the correct build-time `VITE_API_URL`. No public deployment is provisioned here. Run migrations from source with `npm run migrate`; do not mix compiled/source migration names in an existing ledger.

## Security, limitations and future improvements

Full dependency scans now include development tools. Run `npm audit --prefix backend` and `npm audit --prefix frontend`; CI fails on any reported severity. The [history pattern check](scripts/check-secret-patterns.cjs) also runs in CI. These checks do not prove absence of all vulnerabilities.

- No payment gateway is integrated. Cash/payment rows demonstrate the model; merchant confirmation does not prove payment collection.
- Development can continue without Redis, but session refresh/revocation/rate limiting then lose their normal guarantees. Production startup requires Redis and security-store failures return 503.
- Browser tokens use localStorage, so successful XSS can expose them. Cookie sessions need a separate design including CSRF handling.
- Driver lifecycle concurrency, crash-safe migrations, broader browser tests and page error handling need further work; see the audit.
- UI is currently English. Arabic RTL offline forms and IndexedDB synchronization are not implemented.
- No production load result, public demo, SLA, personal contribution or fabricated history is asserted.
