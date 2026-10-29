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
| State | In-memory store (Supabase in Milestone 4) |

---

## Quick start

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173` in your browser.

```bash
npm run build    # production build (tsc + vite)
npm run lint     # oxlint
npm run preview  # serve the production build locally
```

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

### 🔲 Milestone 3 — Roles, permissions, data model
- Role-permission matrix
- Complete relational schema
- Row Level Security policies

### 🔲 Milestone 4 — Authentication and persistent storage
- Supabase Auth
- PostgreSQL schema and migrations
- Protected routes, role-aware onboarding

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
- No authentication. All users see all data.
- No role enforcement. Role restrictions are documented but not yet enforced in the UI or backend.
- Marketplace and project pages are placeholders.
