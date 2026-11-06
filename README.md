# BIOTRACE

**Traceable biomass. Measurable climate impact.**

Climate-fintech MVP for the Access Bank Climate-Fintech Hackathon.
BIOTRACE connects biomass suppliers, cement plants, independent reviewers, and buyers through an auditable workflow for biomass delivery traceability, evidence collection, climate-impact estimation, and project reporting.

> This prototype is **not** an official carbon registry and does **not** issue real carbon credits.
> All emissions estimates are illustrative and use documented assumptions that have not been validated under an approved methodology.
> Marketplace activity is simulated. No real money moves.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 8 |
| Routing | React Router 7 |
| Styling | Tailwind CSS v4, shadcn/ui (radix-nova) |
| Forms | React Hook Form 7 + Zod |
| Icons | Lucide React |
| State | Explicit demo store or Supabase Auth and onboarding |

---

## Quick start

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173` in your browser.

Copy the matching checked-in template to its ignored local file, or configure
separate variables in each deployment environment. Use Vite's environment modes
to keep hosted development, staging, and production projects separate:

| Environment | Vite env file / deployment variables | Data mode |
|---|---|---|
| Development | `.env.development.example` → `.env.development.local` | `demo` for intentional walkthroughs; otherwise `supabase` with the development project |
| Staging | `.env.staging.example` → `.env.staging.local` or staging CI variables | `supabase` with the staging project |
| Production | `.env.production.example` → `.env.production.local` or production variables | `supabase` with the production project |

Supply `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from the matching hosted
project's Supabase Dashboard. The anon key is intended for browser use; never put
a service-role key in Vite environment variables. An unset mode never falls back
to demo data. Production builds do not display demo records when the backend is
unavailable. Demo mode must be selected explicitly for any build intentionally
used as a demo.

```bash
npm run build    # production build (tsc + vite)
npm run lint     # oxlint
npm run preview  # serve the production build locally
```

Supabase mode currently provides email/password authentication, session
restoration, password reset/update, auth callbacks, profile provisioning, and
organization registration with verification status. Migrations `003` and `004`
are additive to migrations `001` and `002` and have been applied to the
configured Development project. Delivery workflows and evidence storage still
use the demo implementation and are not persisted to Supabase.

Configure allowed auth redirect URLs and email verification/password-reset
templates in the hosted Supabase Dashboard. Email delivery and signup behavior
depend on the Development project's Auth settings and SMTP configuration.
Never put a service-role key in the frontend.

---

## Current status

### ✅ Milestone 1 — Foundation and stabilization
- Application shell: responsive sidebar, header, mobile sheet navigation
- BIOTRACE design tokens (deep forest green, warm off-white, charcoal)
- Dashboard connected to live delivery store — KPIs update in real time
- Mobile card layout on the delivery list (below md breakpoint)
- 44 px touch targets throughout
- Supplier-facing plain-English labels
- Production build clean, lint exit 0

### ✅ Milestone 2 — Delivery workflow
- Filterable delivery list with search
- Delivery detail page: full fields, evidence list, status history timeline
- Submit delivery form: React Hook Form + Zod, evidence file upload (PDF/JPG/PNG/WEBP ≤ 5 MB)
- Plant confirmation: weighbridge weight, confirm / dispute decision, weighing ticket upload
- In-memory store with pub/sub so all pages stay in sync
- Seed data: 5 realistic Nigerian deliveries across Lafarge, Dangote, BUA plants

### ✅ Milestone 2b — Reviewer workspace and illustrative MRV
- Review queue at `/review`: deliveries awaiting review or corrections
- Review decision form at `/review/:id`: approve / request corrections / reject with required note
- Status transitions: `awaiting_review` → `reviewed` / `corrections_requested` / `rejected`
- Illustrative MRV calculation module (pure TypeScript, no React)
- MRV calculation view at `/review/:id/mrv`: full input breakdown, factor sources, assumptions, limitations
- Calculation based on ACM0003 v9.0 structure — labelled illustrative, not certified

### ✅ Backend Milestone 1 — Supabase foundation
- Typed Supabase JavaScript client with validated environment configuration
- Additive schema for organizations, facilities, verification, workflow history,
  reviewer assignments, and audit records
- Development project verified with 20 RLS-enabled public tables and read-scoped
  authenticated policies

### 🚧 Backend Milestone 2 — Authentication and organization onboarding
- Supabase email/password signup, login, logout, session restoration, email
  callback, password recovery, and password update
- Auth-triggered profile provisioning and organization verification status
- Trusted RPCs for registration, membership additions, and administrator review
- Delivery persistence, evidence Storage, invitations, and full organization
  administration are not yet implemented

### 🔲 Milestone 5–7 — Projects, marketplace, admin
### 🔲 Milestone 8 — Testing, deployment, pitch

---

## Demo walkthrough

1. Open the dashboard — live KPIs from the seed delivery set.
2. Click **Deliveries** → filter by status, open a delivery.
3. Open `BT-DEL-2026-0042` (pending) → **Record plant weight** → enter weight, attach ticket, confirm.
4. Click **Add a delivery** → fill out the form, attach a file → submit.
5. Click **Review & MRV** → open a delivery in the review queue.
6. Record a review decision (approve, request corrections, or reject).
7. Open the MRV tab to view the illustrative climate calculation with full input breakdown.

---

## Prototype limitations

- Data resets on page refresh (in-memory store, no database yet).
- Evidence files are stored as browser object URLs only — they are not uploaded anywhere.
- Emissions calculations are illustrative. The 0.72 tCO₂e / t figure from an earlier version has been removed. The MRV module uses documented ACM0003 factors with explicit limitations.
- Demo mode has no authentication or role enforcement; all users see demo data.
- Supabase authentication protects the onboarding routes, but the delivery and
  review workflows are not yet connected to authenticated database operations.
- Organization membership creation is limited to the registering owner and the
  trusted add-member RPC; there is no invitation UI.
- Email verification and password reset require correctly configured hosted
  Supabase redirect URLs and email delivery.
- Marketplace and project pages are placeholders.
