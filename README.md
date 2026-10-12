# Talbak — Full-Stack Delivery Platform

A production-grade delivery platform API built with **Node.js + TypeScript**, **PostgreSQL**, and **Redis**. Features a Modular Monolith architecture, role-based access control (RBAC), and full order lifecycle management.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ / TypeScript 5 |
| Framework | Express 4 |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Auth | JWT (Access + Refresh) + Argon2id |
| Validation | Zod |
| Logging | Pino |

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### Setup

```bash
# Clone and install
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run migrate

# Seed demo data
npm run seed

# Start development server
npm run dev
```

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@talbak.com | Demo@1234 |
| Merchant | merchant@talbak.com | Demo@1234 |
| Driver | driver@talbak.com | Demo@1234 |
| Customer | customer@talbak.com | Demo@1234 |

## API Endpoints

### Auth (`/api/v1/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | ✗ | Register (Customer/Merchant/Driver) |
| POST | /login | ✗ | Login |
| POST | /refresh | ✗ | Refresh token (rotation) |
| POST | /logout | ✓ | Logout (blacklists token) |
| GET | /me | ✓ | Current user profile |

### Users (`/api/v1/users`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /profile | ✓ | Get profile |
| PATCH | /profile | ✓ | Update profile |
| PATCH | /password | ✓ | Change password |

### Stores (`/api/v1/stores`)
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | / | ✗ | — | List active stores |
| GET | /:id | ✗ | — | Store details |
| GET | /my | ✓ | Merchant | My stores |
| POST | / | ✓ | Merchant | Create store |
| PATCH | /:id | ✓ | Merchant | Update store |

### Products (`/api/v1/products`)
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | / | ✗ | — | List/search/filter products |
| GET | /:id | ✗ | — | Product details |
| POST | / | ✓ | Merchant | Create product |
| PATCH | /:id | ✓ | Merchant | Update product |
| PATCH | /:id/inventory | ✓ | Merchant | Update stock |
| DELETE | /:id | ✓ | Merchant | Soft delete |

### Categories (`/api/v1/categories`)
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | /stores/:storeId/categories | ✗ | — | Store categories |
| POST | / | ✓ | Merchant | Create category |
| PATCH | /:id | ✓ | Merchant | Update category |
| DELETE | /:id | ✓ | Merchant | Delete category |

### Cart (`/api/v1/cart`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | ✓ | Get cart |
| POST | /items | ✓ | Add item (single-store rule) |
| PATCH | /items/:id | ✓ | Update quantity |
| DELETE | /items/:id | ✓ | Remove item |
| DELETE | / | ✓ | Clear cart |

### Orders (`/api/v1/orders`)
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | / | ✓ | Customer | Create order (from cart) |
| GET | / | ✓ | Any | List orders (role-aware) |
| GET | /:id | ✓ | Any | Order details |
| POST | /:id/cancel | ✓ | Customer | Cancel order |
| POST | /:id/confirm | ✓ | Merchant | Confirm order |
| POST | /:id/reject | ✓ | Merchant | Reject order |
| PATCH | /:id/status | ✓ | Merchant | Update status |

### Deliveries (`/api/v1/deliveries`)
| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | /available | ✓ | Driver | Available deliveries |
| POST | /:id/accept | ✓ | Driver | Accept delivery |
| POST | /:id/pickup | ✓ | Driver | Confirm pickup |
| PATCH | /:id/status | ✓ | Driver | Start transit |
| PATCH | /:id/location | ✓ | Driver | Update location |
| POST | /:id/complete | ✓ | Driver | Complete delivery |
| GET | /history | ✓ | Driver | Delivery history |
| GET | /earnings | ✓ | Driver | Earnings summary |

### Admin (`/api/v1/admin`)
| Method | Path | Description |
|--------|------|-------------|
| GET | /dashboard | Platform statistics |
| GET | /users | List all users |
| PATCH | /users/:id/status | Activate/suspend user |
| GET | /merchants | List merchants |
| PATCH | /merchants/:id/status | Approve/suspend merchant |
| GET | /drivers | List drivers |
| PATCH | /drivers/:id/status | Approve/suspend driver |
| GET | /orders | List all orders |
| GET | /reports | Revenue & analytics |
| GET | /audit-logs | Audit trail |

### Other
| Module | Endpoints |
|--------|-----------|
| Addresses | CRUD + set default |
| Notifications | List, unread count, mark read |
| Ratings | Rate store/driver, public reviews |
| Drivers | Availability toggle, profile |

## Architecture Highlights

- **Modular Monolith** — isolated domain modules with clean boundaries
- **10-Layer Security Pipeline** — Helmet, CORS, Rate Limiting, JWT, RBAC, Parameterized Queries
- **Order State Machine** — enforced valid transitions (PENDING → CONFIRMED → PREPARING → ...)
- **Transactional Order Creation** — cart → order → inventory → payment → delivery in one atomic transaction
- **Cache-Aside Pattern** — Redis caching with proper invalidation on mutations
- **Token Rotation** — refresh tokens are single-use, old tokens invalidated
- **Idempotency** — duplicate order protection via Idempotency-Key header
- **Atomic Driver Assignment** — SELECT FOR UPDATE prevents double-accept race conditions
- **Graceful Shutdown** — SIGTERM/SIGINT handled with connection cleanup

## Project Structure

```
backend/src/
├── app.ts                          # Express bootstrap
├── config/                         # Config + database pool
├── redis/                          # Redis client + cache service
├── common/
│   ├── middleware/                  # Auth, RBAC, validation, rate limit, error handler
│   ├── errors/                     # AppError hierarchy (7+ subclasses)
│   ├── utils/                      # Response, pagination, logger
│   └── constants/                  # Roles, order statuses (state machine), cache keys
├── database/
│   ├── migrations/                 # 10 migration files
│   ├── migrate.ts                  # Migration runner
│   └── seed.ts                     # Demo data seeder
└── modules/
    ├── auth/                       # Register, login, refresh, logout
    ├── users/                      # Profile, password change
    ├── stores/                     # CRUD with cache
    ├── products/                   # CRUD + inventory + search/filter
    ├── categories/                 # Store categories
    ├── cart/                       # Single-store cart with stock validation
    ├── orders/                     # Full order lifecycle
    ├── deliveries/                 # Driver assignment + tracking
    ├── drivers/                    # Availability + profile
    ├── notifications/              # User notifications
    ├── ratings/                    # Store/driver ratings
    ├── addresses/                  # User addresses
    └── admin/                      # Dashboard, reports, management
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (hot reload) |
| `npm run build` | Compile TypeScript |
| `npm start` | Run production build |
| `npm run migrate` | Run migrations |
| `npm run migrate:down` | Rollback migrations |
| `npm run seed` | Seed demo data |
| `npm test` | Run tests |
