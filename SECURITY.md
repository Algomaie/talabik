# Security

This repository is a portfolio project. Passing tests and dependency scans are evidence within their scope, not a guarantee that no vulnerabilities exist.

- Use the latest `main` revision and run all up migrations before starting an updated backend. Migration 012 introduces session revocation state. Sessions issued before the typed-token update must sign in again.
- Use independent generated JWT secrets, production mode, HTTPS, a restricted CORS origin, private PostgreSQL/Redis networking, and a Redis `noeviction` policy when storing revocation/session state.
- New merchant and driver registrations require administrator approval. Demo seed accounts are explicitly approved local examples; do not seed or reuse their public credentials in production.
- Password changes and logout invalidate all existing sessions through a PostgreSQL session-version counter. Refresh tokens also use atomic Redis consumption.
- The frontend currently stores tokens in localStorage. Successful XSS could expose them; no claim of immunity to XSS or production penetration testing is made.
- CI runs full `npm audit` (including development dependencies), tests/builds, and a pattern-based Git-history secret check. The pattern check does not recognize every possible secret.
- The initial commit included a local PostgreSQL password. The owner confirmed it was used only for local experimentation. It was removed from current configuration; history has not been rewritten. Never reuse public demo values for real services.

For a suspected vulnerability, contact the repository owner privately. Do not publish active credentials or private customer data in a public issue. Include the affected commit, minimal reproduction and impact without exposing secrets.

See [security review evidence](docs/SECURITY_REVIEW.md) and the broader [technical audit](docs/TECHNICAL_AUDIT.md).
