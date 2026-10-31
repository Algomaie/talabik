# Talabak React frontend

React + TypeScript + Vite, React Router, Axios and AuthContext. Customer, merchant, driver and admin pages share a role-aware layout; server authorization remains authoritative.

From repository root:

```sh
npm ci --prefix frontend
cp frontend/.env.example frontend/.env
npm run dev --prefix frontend -- --port 5173 --strictPort
npm test --prefix frontend
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm run build --prefix frontend
```

Set `VITE_API_URL` before building. Backend `CORS_ORIGIN` must match the frontend URL. Follow [root setup](../README.md) for services, migrations and local accounts.

## Review entry points

- [StoresPage](src/pages/customer/StoresPage.tsx): REST loading, error/retry, success, filtering and empty states.
- [Stores tests](tests/StoresPage.test.tsx): DOM interactions with a mocked API boundary.
- [LoginPage](src/pages/auth/LoginPage.tsx), [auth tests](tests/Auth.test.tsx): form input, server errors, camelCase user contract.
- [AuthContext](src/context/AuthContext.tsx), [API client](src/lib/api.ts): session state and shared refresh request.
- [AppLayout](src/components/AppLayout.tsx): login and role guards, navigation and responsive sidebar.
- [Dashboard](src/pages/dashboard/DashboardPage.tsx), [Products](src/pages/merchant/MerchantProductsPage.tsx), [Orders](src/pages/customer/CustomerOrdersPage.tsx), [Admin users](src/pages/admin/AdminUsersPage.tsx).

Tests use jsdom/Vitest/Testing Library; they are not browser-to-database end-to-end tests. Hook warnings and API-shape limitations are documented in the [audit](../docs/TECHNICAL_AUDIT.md). UI is English; there is no offline synchronization implementation.
