# Real application screenshots

These files were captured from the actual Vite application in local Edge/Playwright. Desktop viewport was 1440×1000 (full-page images may be taller). They are not generated artwork.

| File | Actual view |
| --- | --- |
| [login.png](login.png) | Login form |
| [dashboard.png](dashboard.png) | Customer dashboard after real local login |
| [products.png](products.png) | Merchant product catalog after fixing the category-response crash |
| [orders.png](orders.png) | Customer order list; captured before final Cart contract fixes |
| [admin-panel.png](admin-panel.png) | Admin users page |
| [login-mobile.png](login-mobile.png) | Login at 390×844; no horizontal overflow observed |
| [ar-login.png](ar-login.png) | Arabic login form with language switcher |
| [ar-products.png](ar-products.png) | Arabic merchant product interface; stored names remain in their original language |
| [ar-mobile.png](ar-mobile.png) | Arabic customer dashboard at 390×844 |

The three `ar-` captures were added in the [localization follow-up](../LOCALIZATION.md) with the real local API, PostgreSQL **and Redis** running. The service limitation below refers to the original English captures.

Authenticated captures used the real API and isolated PostgreSQL database, without intercepted or fabricated API responses. Redis was unavailable, so the API used its documented development fallback. These captures do not verify refresh-token or Redis behavior. Final full browser checkout was not executed because automatic approval review reached its usage limit; see [quality gate](../QUALITY_GATE.md).

## Manual reproduction

1. Follow the root README, use a dedicated demo database, and start PostgreSQL, Redis, backend and frontend.
2. Open `http://localhost:5173/login`. Capture `login.png` without tokens or developer tools visible.
3. Login with local demo accounts and capture `/dashboard` as `dashboard.png`, `/merchant/products` as `products.png`, `/my-orders` as `orders.png`, `/admin/users` as `admin-panel.png`.
4. Wait for real API responses; do not replace missing data with mocks for screenshots. State any unavailable service.
5. Capture desktop and optionally mobile views. Never include real customer information or secrets. Do not publish a public demo without owner approval.

The in-app browser runtime failed to initialize in this environment; the login capture used the bundled Playwright package and installed Edge as a fallback.
