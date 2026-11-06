# BIOTRACE Milestone 1 Readiness Report

## Scope and method

This is a read-only review of the Development Supabase foundation and the local
application configuration. No database records, grants, policies, migrations,
or application behavior were changed for this review. No Docker or local
Supabase services were used. Remote checks were directed to the linked
Development project (`exvtfpqqmdjyqlxqemip`); Production was not linked or
queried.

The Development checks previously confirmed 20 public tables, RLS enabled on
all 20, and 21 policies. The direct grants check confirmed SELECT for
`authenticated` on all 20 tables and all five listed table privileges for
`service_role`; no `anon` table grants were returned. `authenticated` also has
a column-level UPDATE grant for `profiles.full_name`. The remote `migration
list` and policy-list commands started for this review stalled during CLI role
initialization and were stopped. Therefore, this report uses the recorded
read-only Development results and local migration definitions; it does not
claim a fresh successful query for those stalled commands.

## Executive status

| Area | Status | Finding |
|---|---|---|
| Database grants | PASS | `anon` has no table grants; `authenticated` has SELECT and a narrowly scoped profile-name UPDATE; `service_role` has broad privileges. |
| RLS coverage | PASS | All 20 Development public tables have RLS enabled and at least one of the 21 reviewed policies. |
| Policy scope | WARNING | Most policies scope reads by membership, approval, facility, assignment, or administrator status. A reviewer-conflict policy also lets any participant who can access a delivery read that delivery's conflict record. |
| Role and approval protection | PASS | Client UPDATE is limited to `profiles.full_name`; there are no client table-level write grants for roles, organization approval, memberships, or workflow records. |
| Authorization recursion | PASS, qualified | The reviewed helper functions are `SECURITY DEFINER` and query protected tables without relying on policies recursively. This is a source review, not a runtime role-matrix test. |
| Migration history | PASS, qualified | Development was previously verified with migrations 001 and 002 recorded and the expected 20-table/21-policy counts. A fresh migration-list check in this review stalled. |
| Full schema equivalence | UNVERIFIED | Object counts match the intended foundation, but exact remote columns, constraints, function definitions, and grants were not independently diffed in this review. |
| Production state | UNVERIFIED | Production was not queried. No Production migration or database modification was made in this task. |
| Persistent application writes | BLOCKER | The client has no workflow write grants, and no trusted RPC/Edge Function write implementation exists yet. |
| Production demo-mode guard | PASS (remediated after review) | The initial audit found explicit demo mode was accepted in production. After the review, the selected follow-up added a production guard; demo mode now resolves to a configuration error in production. |

## 1. Database permissions

### Observed Development grants

| Role | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | Assessment |
|---|---:|---:|---:|---:|---:|---|
| `anon` | No table grants observed | No | No | No | No | PASS; anonymous API access has no direct table privileges. |
| `authenticated` | All 20 public tables | No table-level grant | `profiles.full_name` only | No | No | PASS for the read-first foundation. RLS still filters SELECT rows. |
| `service_role` | All 20 public tables | All 20 | All 20 | All 20 | All 20 | Expected for a trusted server role, but it bypasses RLS; its secret key must never be shipped to the browser. |

The authenticated user's profile-name UPDATE is column-level, not a grant to
update the entire profile row. It does not grant writes to role, organization,
approval, or platform-admin fields.

The lack of authenticated direct writes is intentional in this foundation:
delivery submission, confirmation, review, approval, and related writes need
transactional validation and trusted actor identity. The migrations do not
provide working write RPC functions or Edge Functions for those workflows yet.
They must not be implemented by exposing `service_role` in the React client.
The eventual write path should be narrowly scoped RPC functions and/or trusted
Edge Functions that validate the caller, role, organization/facility
membership, approval, state transition, and audit history. Grant only the
specific function execution needed; do not grant broad table writes.

**Practical impact:** The current client cannot persist normal workflow actions
to Supabase. Missing INSERT/UPDATE/DELETE grants are not a defect in the
read-only foundation, but a functional blocker for replacing the demo store.
No missing direct write permission should be added until the trusted workflow
mechanism and its authorization checks are implemented.

## 2. RLS and policy review

### Table coverage

All of these 20 Development `public` tables were reported with RLS enabled and
at least one policy:

`profiles`, `organizations`, `organization_memberships`, `deliveries`,
`evidence_files`, `review_decisions`, `delivery_status_history`,
`organization_verifications`, `organization_verification_documents`,
`facilities`, `facility_memberships`, `reviewer_profiles`, `projects`,
`plant_confirmations`, `review_assignments`, `reviewer_conflicts`, `reviews`,
`delivery_events`, `audit_logs`, and `platform_admins`.

No table without a policy was identified. The 21 policy definitions in local
migration 002 are:

1. `profiles_select_self_or_admin`
2. `profiles_update_own_name`
3. `organizations_select_members_or_admin`
4. `memberships_select_self_org_admin_or_platform_admin`
5. `deliveries_select_authorized_participants`
6. `evidence_select_authorized_delivery_participants`
7. `reviews_select_authorized_delivery_participants` (on `review_decisions`)
8. `delivery_history_select_authorized_participants`
9. `verifications_select_org_members_or_admin`
10. `verification_documents_select_org_members_or_admin`
11. `facilities_select_org_members_or_admin`
12. `facility_memberships_select_self_org_admin_or_platform_admin`
13. `reviewer_profiles_select_self_or_admin`
14. `reviewer_conflicts_select_participants_or_admin`
15. `projects_select_owner_buyer_or_admin`
16. `plant_confirmations_select_delivery_participants`
17. `review_assignments_select_delivery_participants`
18. `reviews_select_delivery_participants`
19. `delivery_events_select_delivery_participants`
20. `audit_logs_select_platform_admins`
21. `platform_admins_select_self_or_admin`

### Access scope and integrity

- Most read policies use `biotrace_private` helper functions to scope rows to
  the user's organization membership, approval state, facility, assigned
  reviewer status, delivery participation, or platform-admin status. Project
  access is scoped to the owner, eligible buyer, or administrator.
- The reviewed client grants do not permit users to insert or update their
  privileged profile roles, change organization approval, add themselves to
  `platform_admins`, or write delivery/review workflow data. The only
  authenticated UPDATE grant is `profiles.full_name`.
- The prior review found no obvious policy recursion. Migration 002 uses
  `SECURITY DEFINER` helper functions with a fixed search path for membership,
  admin, assignment, and delivery-access checks. This avoids policies querying
  their own protected tables as the caller. Runtime behavior under each
  Supabase role has not been exhaustively tested.
- **WARNING — reviewer-conflict visibility:** `reviewer_conflicts_select_participants_or_admin`
  allows a user who can access a delivery to read that delivery's conflict
  record, in addition to the conflict participant or platform administrator.
  That can reveal conflict metadata to supplier/plant participants who may not
  need it. Reconsider limiting this to the affected reviewer and authorized
  administrators, unless delivery participants are deliberately meant to see
  those records.
- Broad `service_role` access bypasses RLS by design. A leaked service-role key
  would defeat these protections; keep it exclusively in a trusted server
  secret store and never in Vite environment variables or client bundles.

## 3. Migration verification

- **PASS, based on previously recorded Development checks:** Migrations `001`
  and `002` were applied to the Development project; migration history was
  previously confirmed, with 20 public tables, RLS on all 20, and 21 policies.
- **PASS, scope:** Earlier migration execution and subsequent checks targeted
  Development ref `exvtfpqqmdjyqlxqemip`, not Production. No migration command
  targeting Production was run in this review.
- **UNVERIFIED:** Current Production migration history and schema. Production
  was not queried, so the present state or historical changes cannot be
  independently confirmed here.
- **UNVERIFIED:** Complete live-schema equivalence. Counts and migration
  history support the expected foundation, but no full remote schema
  comparison of every column, constraint, index, function, grant, and policy
  definition was completed. The fresh read-only CLI migration/policy
  inspections stalled during role initialization.

**Recommended correction:** Before promoting migrations, run a controlled
read-only schema and migration-history comparison against each hosted project
using an approved remote workflow. Review any diff before applying changes.
Do not treat matching table/policy counts alone as proof that every definition
matches.

## 4. Application integration

| Check | Status | Evidence and impact |
|---|---|---|
| Typed Supabase client | PASS, qualified | `src/lib/supabase.ts` initializes a typed client from validated Vite configuration. This is configuration/client setup, not proof of end-to-end data access. |
| Environment validation | PASS | Missing or invalid Supabase configuration resolves to a configuration-error state with a user-facing explanation rather than silently selecting demo records. |
| Explicit demo selection | PASS | Demo mode is selected through `VITE_DATA_MODE=demo`; unset/invalid mode does not silently select seeded data. |
| Production demo guard | PASS (remediated after review) | The initial audit found `resolveDataMode` accepted explicit `demo` in production. The follow-up fix now checks `import.meta.env.PROD` and returns a configuration error; the UI explains that demo mode is disabled in production. |
| Persistent Supabase integration | BLOCKER | Supabase mode currently explains that persistent application data access is not implemented. Workflow reads/writes are not yet wired to hosted tables. |
| Authentication and Storage | UNVERIFIED / not implemented | This review did not find an implemented authentication workflow or remote evidence-file Storage integration. Do not treat database RLS as protection for an unimplemented Storage bucket. |
| Production fallback to mock | PASS with caveat | There is no automatic production fallback to mock records. However, an explicit production `VITE_DATA_MODE=demo` still enables them; fail-closed production enforcement is recommended. |

**Recommended correction:** The production demo-mode guard was implemented
after this review and verified by focused tests and a production build. Also
enforce `VITE_DATA_MODE=supabase` in Production deployment configuration. Keep
a separate Development project and separate credentials. Implement trusted
workflow writes before describing the application as persistent or
production-ready.

## Follow-up remediation and validation

After the read-only review was complete, the user selected the production
demo-mode finding for remediation. `src/lib/data-access.ts` now rejects
`VITE_DATA_MODE=demo` when `import.meta.env.PROD` is true and gives a specific
configuration error. `src/lib/data-access.test.ts` now tests both production
and non-production selection. No migration policy or hosted database was
changed.

- Focused test: `npm run test -- --run src/lib/data-access.test.ts` — PASS,
  3 tests.
- Production build: `npm run build` — PASS (existing large-chunk warning).
- Lint: `npm run lint` — PASS (existing React warnings in button, badge,
  SubmitDeliveryPage, ReviewPage, and PlantConfirmationPage).

## Required follow-up before production use

1. Implement and test narrowly scoped trusted write operations for delivery,
   plant confirmation, review, approval, and audit-history workflows. Do not
   grant direct client table writes as a shortcut.
2. Add a fail-closed production guard against demo mode and verify the actual
   deployment environment values without exposing credentials.
3. Decide whether delivery participants should see reviewer-conflict records;
   narrow that policy if not.
4. Verify Production state read-only and compare the complete remote schema
   against the reviewed migrations before any promotion.
5. Exercise RLS as `anon`, representative authenticated roles, and the trusted
   server role in a safe Development environment. Counts and SQL inspection
   are not a substitute for authorization tests.

## Security-review findings summary

| # | Severity | File | Lines | Vulnerability | Confidence |
|---|----------|------|-------|---------------|------------|
| 1 | 🟡 MEDIUM | src/lib/data-access.ts | 15 | FIXED after review: explicit demo mode is now rejected in production; focused tests and the production build passed. | 9/10 |
| 2 | ⚪ LOW | supabase/migrations/002_backend_foundation.sql | 502 | Delivery participants can read reviewer-conflict metadata for deliveries they can access; confirm this visibility is intended. | 7/10 |
