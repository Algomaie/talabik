# Assessment preparation: Arabic offline form

This is a proposed 3–4 hour exercise, **not an implemented Talabak feature or the employer's final brief**. Confirm the actual requirements before extending the scope.

## Minimal scope and architecture

One Arabic customer-request form: name, phone and message. React + TypeScript, Express and PostgreSQL. Avoid dashboards, uploads and complex background workers unless requested.

```text
src/RequestForm.tsx         Arabic accessible form + validation
src/queue.ts               IndexedDB persistence and state transitions
src/sync.ts                One foreground synchronizer
src/api.ts                 POST /api/requests, Idempotency-Key
server/app.ts              Express app exported without listening on import
server/requests.ts         Validation -> transaction -> INSERT -> response
server/migrations/001.sql  requests + unique idempotency constraint
tests/                     DOM, API and database tests
```

| Time | Deliverable |
| --- | --- |
| 0–25 min | Working skeleton, database connection and schema |
| 25–70 min | Arabic RTL form, labels, validation and submit state |
| 70–120 min | IndexedDB save, queue status and retry UI |
| 120–165 min | API persistence, idempotency and sync loop |
| 165–210 min | DOM/API tests and real DB integration |
| 210–240 min | Offline/reload/retry demonstration and README |

## Arabic form and persistence

Use `<form lang="ar" dir="rtl">`, visible labels الاسم، رقم الهاتف، الرسالة، حفظ الطلب, CSS logical properties and `aria-describedby` for field errors. Keep phone input `dir="ltr"`; use `role="alert"` for submit errors. Validate trimmed required fields and length limits on client and server.

Generate `crypto.randomUUID()` once per submission. Persist `{ id, payload, state: 'pending', attempts: 0, createdAt, nextAttemptAt }` in IndexedDB in one transaction. Only display “تم الحفظ على هذا الجهاز” after transaction completion. Local save is not server save. On quota/storage failure preserve typed input and display the failure.

## Pending queue and retry

Trigger sync after saving, on startup, on `online`, and via إعادة المحاولة. `navigator.onLine` is only a hint: attempt the API call to determine reachability.

Use one in-flight worker per tab. Read due pending records, mark one syncing, send `Idempotency-Key: record.id`, and mark synced only after acknowledgment. On reload recover abandoned syncing records to pending. A short expiring lease can coordinate tabs; database uniqueness remains the final duplicate barrier.

- Network/timeout/5xx: retain the same key; bounded exponential backoff with jitter, capped at 60 seconds.
- 429: honor `Retry-After` when present.
- 400/422: retain record and show a correction error; no infinite retries.
- 401/403: pause and explain authorization requirements.
- 409 for the same key with changed payload: show a conflict, never silently replace the stored request.

`AbortController` bounds waiting, but timeout does not prove the server failed to commit. Retry uncertain outcomes with the same key. Editing an uncertain submission must not silently generate a new key and create duplicates. Service workers/background sync are optional, outside the minimum implementation.

## Express and PostgreSQL

`POST /api/requests` validates key and body. Store key, normalized payload or canonical hash, server ID and response data. For authenticated tasks use uniqueness on `(user_id, idempotency_key)` and derive the owner from the session.

Within one transaction, use parameterized INSERT with a unique constraint. On conflict fetch the existing row and compare normalized payload: same key/payload returns its original ID; changed payload returns 409. Concurrency must be resolved in PostgreSQL, not solely with an in-memory map or Redis TTL. Specify whether replay returns 200 or original 201.

Response example: `{ id, status: 'saved', createdAt }`. Bound body size, restrict CORS, use environment variables and generic 500 errors with request IDs. Never log raw contact details, messages or tokens.

## Minimum test proof

1. React: Arabic labels render, invalid input shows errors, valid input saves locally and shows pending state. Identify any IndexedDB test double explicitly.
2. Sync: first request fails, second succeeds using the same key; local status changes only after acknowledgment. Also test reload recovery and a permanent validation error.
3. Supertest: invalid payload rejected, valid request saved, parallel replays return one ID, changed payload rejected.
4. Real PostgreSQL: exactly one row after simultaneous requests. A mocked repository is not database integration.

Manual demo: disconnect, fill form, save, reload, observe pending record, reconnect, sync, query PostgreSQL for one row, replay to prove duplicate suppression. State which steps were manual versus automated.

Relevant Talabak examples: [orders](../backend/src/modules/orders/orders.service.ts), [API tests](../backend/tests/api.test.ts), [PostgreSQL integration](../backend/tests/checkout.integration.test.ts), [React tests](../frontend/tests/StoresPage.test.tsx). Its online cart is not an offline queue.
