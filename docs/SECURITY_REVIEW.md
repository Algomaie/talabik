# Follow-up security review

Date: 31 October 2026. Scope: the published `86c3484` revision, the initial commit, dependency lockfiles including development tools, and targeted authentication/authorization/business-state review. Findings below led to a follow-up fix; they do not certify the absence of all vulnerabilities.

## Dependency findings

The earlier readiness scan used `npm audit --omit=dev`. Its zero-result statement applied only to that scope. A subsequent full scan reported **8 backend** and **5 frontend** findings, including critical development-tool dependency chains. This distinction matters: uploading source containing vulnerable development dependencies is not the same as publicly deploying an exploitable test server, but those findings still needed remediation.

Vitest was upgraded to 5.0.5, Vite to 8.3.5, and affected transitive packages were updated. Unused Swagger packages and their types were removed rather than retaining an unmounted API-documentation dependency chain. Full `npm audit --audit-level=low` then reported **zero findings for both packages** at the time of this review. All dependency categories are now checked in CI; future advisory changes can fail the check.

## Code findings and fixes

| Finding | Fix | Verification |
| --- | --- | --- |
| Merchant/driver registration automatically assigned APPROVED, bypassing the admin approval workflow | New profiles start PENDING; merchant operations require approved profile; pending drivers cannot list/accept jobs or go online | Real PostgreSQL/API tests cover pending, admin approval, and suspension |
| Old access and refresh tokens survived password change | Additive `012_session_version` migration; include/check session version in typed JWT claims; increment it with password update and logout | Integration test rejects both old token kinds, verifies new login, then rejects logged-out sessions |
| Access-token verification accepted insufficiently typed claims | Require HS256, UUID user/token IDs, issuance/expiry, explicit access/refresh purpose, and nonnegative session version | API tests reject missing expiry, malformed IDs and refresh-purpose tokens at access endpoints |
| Simultaneous acceptance of different jobs could assign multiple deliveries to one driver | Lock an approved ONLINE driver row inside the acceptance transaction; BUSY drivers cannot toggle themselves back online | Two concurrent accept requests produce one 200 and one 409; one assignment persists |
| Location endpoint could report success for an unowned/inactive job and still update driver location | Require a matching active assigned delivery before changing driver location | Source review and existing build checks; targeted invalid-location integration is still desirable |
| Ownership helper allowed missing owner identifiers | Fail closed for unknown owner | Unit regression |
| Merchant approval query failed because PostgreSQL inferred conflicting types for its status parameter | Explicit varchar casts | Real admin approval integration reproduced the failure and passed after the fix |
| Local Redis configuration allowed eviction of session/revocation keys | Switch Compose policy to noeviction; optional cache failures remain separate from production security-store failures | Config review; CI uses a real Redis service, local Compose unavailable |

## Secret/history review

A location-only scanner inspected both original commits and 200 unique blobs during the initial follow-up scan. It found no matching private-key, AWS, GitHub, OpenAI, Slack or Google API token patterns. Thirty-five credential-assignment candidate locations were identified for context review; examples/tests, UI password fields and local connection instructions account for these locations. No actual `.env` file was committed.

The initial legacy seed contained a fixed PostgreSQL password, and local example/Compose credentials also existed in history. **The owner explicitly confirmed the PostgreSQL password was local experimental data only.** Current configuration uses environment variables, and no existing Git history was rewritten. This is not a guarantee against secrets in unknown formats or unexamined external copies.

The reusable [history-pattern checker](../scripts/check-secret-patterns.cjs) reports paths/rules only and also rejects tracked environment files other than examples. It is now a CI job. Dependency alerts and pattern scans complement source review; neither proves all authorization paths are safe.

## Local test results for this follow-up

- Frontend: 6 tests passed with updated tooling; production build passed.
- Backend: 20 tests passed, including malformed token, suspension, stale session and ownership regressions.
- Real PostgreSQL integration: 6 tests passed, covering checkout/delivery plus approval, session revocation and driver concurrency. The Redis session-store boundary is explicitly doubled in these suites.
- Real Redis integration: skipped locally because Redis is unavailable; verify the follow-up GitHub Actions run before claiming its result.
- Both full dependency audits: zero findings at the time executed.

The pending merchant approval test first exposed an existing 500 response; its SQL parameter inference issue was fixed and the suite rerun successfully.

## Remaining limitations

No public application was deployed. Tokens remain in localStorage, profile registration still spans separate user/profile transactions, migration execution lacks a global lock/crash-atomic ledger, and the application has not undergone an independent penetration test or production load assessment. These limits must remain visible rather than asserting “no vulnerabilities.” A source repository can be shared for review with these limits; a production deployment requires a separate release/security review.
