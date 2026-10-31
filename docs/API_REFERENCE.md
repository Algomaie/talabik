# API reference

Base URL: `http://localhost:5000/api/v1`. The route files under `backend/src/modules/` are the authoritative contract. This table is a navigation aid, not generated OpenAPI documentation. Swagger packages are installed but no Swagger route is mounted.

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
