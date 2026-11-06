import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Factory,
  Layers,
  Scale,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Eye,
  BarChart3,
  FileText,
  GitMerge,
} from 'lucide-react'
import { BiotraceMark } from '@/components/brand/BiotraceMark'
import { Button } from '@/components/ui/button'
import { DATA_MODE } from '@/lib/data-access'
import { DeliveryStatusBadge } from '@/components/shared/StatusBadge'

// ─── Inline product preview component ────────────────────────────────────────
// Rendered HTML/CSS faithful mockup of the application UI
function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg">
      {/* Mock app chrome */}
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="size-2.5 rounded-full bg-border" />
        <span className="ml-3 flex-1 rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground">
          biotrace.app/deliveries
        </span>
      </div>
      {/* Mock sidebar + content */}
      <div className="flex h-[340px] sm:h-[400px]">
        {/* Sidebar */}
        <div className="hidden w-44 shrink-0 flex-col gap-0.5 border-r border-border bg-sidebar p-3 sm:flex">
          <div className="mb-3 flex items-center gap-2 px-2 py-1">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-primary/20 text-sidebar-foreground">
              <BiotraceMark className="size-3.5" />
            </span>
            <span className="text-[11px] font-semibold tracking-widest text-sidebar-foreground">BIOTRACE</span>
          </div>
          {[
            { label: 'Dashboard', active: false },
            { label: 'Deliveries', active: true },
            { label: 'Review & MRV', active: false },
            { label: 'Projects', active: false },
          ].map(({ label, active }) => (
            <div
              key={label}
              className={`rounded-md px-2 py-1.5 text-[11px] font-medium ${
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/60'
              }`}
            >
              {label}
            </div>
          ))}
        </div>
        {/* Main content */}
        <div className="flex-1 overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Deliveries</p>
            <p className="text-xs text-muted-foreground">Biomass deliveries and plant confirmations</p>
          </div>
          <div className="p-4 space-y-2">
            {/* Mock toolbar */}
            <div className="flex gap-2 mb-3">
              <div className="h-8 flex-1 max-w-44 rounded-md border border-border bg-muted/50" />
              <div className="h-8 w-28 rounded-md border border-border bg-muted/50" />
              <div className="h-8 w-24 rounded-md bg-primary opacity-80" />
            </div>
            {/* Mock table rows */}
            {[
              { ref: 'BIO-20261018-A4F1', supplier: 'Ogun Agro Residues', status: 'awaiting_review' as const },
              { ref: 'BIO-20261021-B7C2', supplier: 'Benue Sawdust Co-op', status: 'pending_plant_confirmation' as const },
              { ref: 'BIO-20261012-D3E9', supplier: 'Kaduna Cotton Stalk', status: 'reviewed' as const },
              { ref: 'BIO-20261014-F8A5', supplier: 'Cross River Cocoa Hub', status: 'corrections_requested' as const },
            ].map((row) => (
              <div key={row.ref} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-foreground font-mono">{row.ref}</p>
                  <p className="truncate text-[10px] text-muted-foreground">{row.supplier}</p>
                </div>
                <DeliveryStatusBadge status={row.status} className="text-[9px] shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Section components ───────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{children}</p>
  )
}

function StepNumber({ n }: { n: number }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-sm font-semibold text-primary">
      {n}
    </span>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function HomePage() {
  const navigate = useNavigate()

  function handleGetStarted() {
    navigate(DATA_MODE === 'supabase' ? '/signup' : '/dashboard')
  }

  function handleExplore() {
    navigate(DATA_MODE === 'supabase' ? '/login' : '/dashboard')
  }

  return (
    <div className="space-y-0">

      {/* ══ 1. HERO ═══════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative overflow-hidden border-b border-border bg-sidebar"
        style={{
          backgroundImage: 'radial-gradient(circle at 70% 50%, rgba(53,163,107,0.12) 0%, transparent 60%), radial-gradient(circle at 20% 80%, rgba(35,107,79,0.15) 0%, transparent 50%)',
        }}
        aria-label="Hero"
      >
        <div className="mx-auto max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-28 lg:pb-28 lg:pt-32">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sidebar-border bg-sidebar-accent/60 px-3 py-1.5">
              <span className="size-1.5 rounded-full bg-[#35A36B]" aria-hidden />
              <span className="text-xs font-medium text-sidebar-foreground/80">
                Prototype · For demonstration purposes
              </span>
            </div>

            <h1 className="text-4xl font-semibold leading-[1.15] tracking-tight text-sidebar-foreground sm:text-5xl lg:text-6xl">
              Turning biomass supply chains into{' '}
              <span className="text-[#35A36B]">measurable climate impact.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-sidebar-foreground/65">
              BIOTRACE connects biomass suppliers, cement plants, independent reviewers
              and carbon-market participants through traceable deliveries, utilization
              records and transparent MRV workflows.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-[#35A36B] text-white hover:bg-[#35A36B]/90 focus-visible:ring-[#35A36B]"
                onClick={handleGetStarted}
              >
                Get started
                <ArrowRight className="size-4" aria-hidden />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/60"
                onClick={handleExplore}
              >
                Explore the platform
              </Button>
            </div>

            <p className="mt-5 text-xs text-sidebar-foreground/40">
              Credit issuance and registry interactions are simulated. No real credits are issued.
            </p>
          </div>
        </div>

        {/* Decorative grid */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.03]"
          aria-hidden
          style={{
            backgroundImage: 'linear-gradient(var(--sidebar-border) 1px, transparent 1px), linear-gradient(90deg, var(--sidebar-border) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </section>

      {/* ══ 2. PRODUCT PREVIEW ════════════════════════════════════════════════ */}
      <section
        id="product"
        className="border-b border-border bg-background"
        aria-labelledby="product-heading"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <SectionLabel>Platform</SectionLabel>
            <h2 id="product-heading" className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Every step of the supply chain, visible.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              From sourcing declaration to plant confirmation to independent review —
              all in one auditable record.
            </p>
          </div>
          <div className="mx-auto max-w-4xl">
            <ProductPreview />
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Live platform interface — demo data. Values are illustrative only.
          </p>
        </div>
      </section>

      {/* ══ 3. THE PROBLEM ════════════════════════════════════════════════════ */}
      <section className="border-b border-border bg-muted/30" aria-labelledby="problem-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <SectionLabel>The challenge</SectionLabel>
              <h2 id="problem-heading" className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Biomass substitution has a traceability problem.
              </h2>
              <p className="text-base leading-7 text-muted-foreground">
                Cement production accounts for roughly 7–8% of global CO₂ emissions. Replacing fossil
                fuels with waste biomass can meaningfully reduce that impact — but without a trusted
                record, none of it is verifiable.
              </p>
              <p className="text-base leading-7 text-muted-foreground">
                Declared quantities differ from measured weights. Evidence is held in disconnected
                systems. Reviewers lack structured access to delivery records. The gap between
                biomass supplied and biomass verified is exactly where climate integrity is lost.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Declared weight ≠ measured weight', detail: 'Supplier declarations are not verified at source.' },
                { label: 'Accepted ≠ consumed', detail: 'Plant acceptance does not confirm biomass was actually combusted.' },
                { label: 'Reviewed ≠ credited', detail: 'A review decision is not the same as formal registry issuance.' },
                { label: 'Estimated ≠ verified reduction', detail: 'Illustrative MRV outputs require independent validation.' },
              ].map(({ label, detail }) => (
                <div key={label} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                  <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-destructive/10">
                    <span className="size-2 rounded-full bg-destructive" aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══ 4. THE SOLUTION ═══════════════════════════════════════════════════ */}
      <section className="border-b border-border bg-background" aria-labelledby="solution-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <SectionLabel>The solution</SectionLabel>
            <h2 id="solution-heading" className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              One traceable record from source to review.
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Eye,
                title: 'End-to-end traceability',
                detail: 'Every delivery links supplier, aggregator, plant and auditor in a single auditable trail.',
              },
              {
                icon: Scale,
                title: 'Weighbridge-verified quantities',
                detail: 'Declared and measured weights are recorded separately. Discrepancies are flagged and documented.',
              },
              {
                icon: ClipboardCheck,
                title: 'Structured independent review',
                detail: 'Reviewers access the complete evidence package and record a formal decision against each delivery.',
              },
              {
                icon: BarChart3,
                title: 'Transparent MRV calculations',
                detail: 'Every input, assumption and step of the illustrative calculation is visible and documented.',
              },
            ].map(({ icon: Icon, title, detail }) => (
              <div key={title} className="space-y-3 rounded-xl border border-border bg-card p-5">
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 5. HOW IT WORKS ═══════════════════════════════════════════════════ */}
      <section className="border-b border-border bg-muted/30" aria-labelledby="workflow-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <SectionLabel>Workflow</SectionLabel>
            <h2 id="workflow-heading" className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              How the platform works.
            </h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Eight stages from biomass sourcing to eligible environmental assets.
            </p>
          </div>
          <div className="mx-auto max-w-3xl space-y-0">
            {[
              { n: 1, title: 'Sourcing', detail: 'Biomass supplier registers origin, material type and supply capacity. Sourcing documentation is submitted for administrator review.' },
              { n: 2, title: 'Aggregation', detail: 'Aggregators consolidate supply from multiple sources and coordinate shipments to cement plants.' },
              { n: 3, title: 'Delivery declaration', detail: 'Supplier or aggregator declares a delivery: biomass type, origin, declared weight and supporting evidence.' },
              { n: 4, title: 'Plant acceptance', detail: 'Cement plant operator records the measured weighbridge weight. Confirmed and disputed deliveries are separately tracked.' },
              { n: 5, title: 'Biomass utilization', detail: 'Plant records actual biomass consumed in kiln operations. Delivered ≠ accepted ≠ consumed.' },
              { n: 6, title: 'MRV calculation', detail: 'An illustrative avoided-emissions estimate is calculated using IPCC reference factors and plant-specific inputs where available.' },
              { n: 7, title: 'Independent review', detail: 'Assigned reviewers inspect the evidence package, verify quantities and record a formal decision. A review is not credit issuance.' },
              { n: 8, title: 'Eligible environmental assets', detail: 'Reviewed deliveries that pass eligibility assessment may be included in a simulated issuance batch. No real registry interaction occurs.' },
            ].map(({ n, title, detail }) => (
              <div key={n} className="flex gap-5">
                <div className="flex flex-col items-center pt-1">
                  <StepNumber n={n} />
                  {n < 8 && <div className="mt-1 h-full w-px bg-border" aria-hidden />}
                </div>
                <div className="min-w-0 pb-8">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <Button asChild variant="outline">
              <Link to="/how-it-works">
                Full workflow detail
                <ChevronRight className="size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ══ 6. STAKEHOLDER ECOSYSTEM ══════════════════════════════════════════ */}
      <section id="stakeholders" className="border-b border-border bg-background" aria-labelledby="stakeholders-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <SectionLabel>Stakeholders</SectionLabel>
            <h2 id="stakeholders-heading" className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Built for every participant.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Layers,
                role: 'Biomass Supplier',
                audience: 'Agricultural residue producers, waste processors',
                capabilities: ['Declare and track deliveries', 'Upload evidence files', 'View supply history', 'Monitor delivery status'],
              },
              {
                icon: Truck,
                role: 'Biomass Aggregator',
                audience: 'Logistics and supply consolidators',
                capabilities: ['Manage supplier network', 'Coordinate consolidated shipments', 'Track aggregated inventory'],
              },
              {
                icon: Factory,
                role: 'Cement Plant',
                audience: 'Cement manufacturing facilities',
                capabilities: ['Record weighbridge measurements', 'Confirm or dispute deliveries', 'Log biomass utilization', 'View eligibility status'],
              },
              {
                icon: ClipboardCheck,
                role: 'Auditor',
                audience: 'Independent verification firms',
                capabilities: ['Access assigned review queue', 'Inspect evidence packages', 'Review MRV calculations', 'Record formal decisions'],
              },
              {
                icon: ShoppingBag,
                role: 'Carbon Buyer',
                audience: 'Environmental asset purchasers',
                capabilities: ['Browse eligible projects', 'View traceability records', 'Access simulated marketplace'],
              },
              {
                icon: ShieldCheck,
                role: 'Administrator',
                audience: 'BIOTRACE platform operators',
                capabilities: ['Verify organizations', 'Assess plant eligibility', 'Manage issuance batches', 'Full audit log access'],
              },
            ].map(({ icon: Icon, role, audience, capabilities }) => (
              <div key={role} className="rounded-xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{role}</h3>
                    <p className="text-xs text-muted-foreground">{audience}</p>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {capabilities.map((c) => (
                    <li key={c} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="size-3 shrink-0 text-primary/60" aria-hidden />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ 7. TRACEABILITY & EVIDENCE ════════════════════════════════════════ */}
      <section className="border-b border-border bg-muted/30" aria-labelledby="traceability-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div className="space-y-5">
              <SectionLabel>Traceability</SectionLabel>
              <h2 id="traceability-heading" className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Evidence attached at every step.
              </h2>
              <p className="text-base leading-7 text-muted-foreground">
                Delivery notes, weighing tickets, transport documents and photographic
                evidence are attached to each delivery record. Reviewers access the
                complete package — not a summary.
              </p>
              <ul className="space-y-2">
                {[
                  'Delivery note linked to specific delivery record',
                  'Weighing ticket from plant weighbridge',
                  'Transport documentation and vehicle reference',
                  'Photographic evidence of load',
                  'Complete status history with actor identity and timestamps',
                  'Append-only audit trail — no silent modifications',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              {/* Mock evidence card */}
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Evidence files</p>
                  <p className="text-xs text-muted-foreground">BIO-20261018-A4F1 · 4 files attached</p>
                </div>
                <div className="divide-y divide-border">
                  {[
                    { kind: 'Delivery note', name: 'delivery_note_ogun_oct18.pdf', size: '142 KB' },
                    { kind: 'Weighing ticket', name: 'weighbridge_ticket_ewekoro.pdf', size: '68 KB' },
                    { kind: 'Photo', name: 'load_photo_001.jpg', size: '1.2 MB' },
                    { kind: 'Transport doc', name: 'waybill_lag482kd.pdf', size: '89 KB' },
                  ].map(({ kind, name, size }) => (
                    <div key={name} className="flex items-center gap-3 px-4 py-2.5">
                      <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">{name}</p>
                        <p className="text-[10px] text-muted-foreground">{kind} · {size}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 8. MRV AND REVIEW ═════════════════════════════════════════════════ */}
      <section className="border-b border-border bg-background" aria-labelledby="mrv-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            {/* MRV panel mockup */}
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-foreground">Illustrative climate estimate</p>
                  <span className="mt-1 inline-flex items-center rounded-full border border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--status-warning)]">
                    Illustrative — defaults applied
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-px bg-border p-px">
                  {[
                    { label: 'Gross avoided', value: '14.87 tCO₂e' },
                    { label: 'Transport leakage', value: '–0.52 tCO₂e' },
                    { label: 'Net avoided', value: '14.35 tCO₂e', primary: true },
                  ].map(({ label, value, primary }) => (
                    <div key={label} className={`px-3 py-3 ${primary ? 'bg-primary/5' : 'bg-card'}`}>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className={`mt-0.5 text-sm font-semibold tabular-nums ${primary ? 'text-primary' : 'text-foreground'}`}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 text-[10px] text-muted-foreground border-t border-border">
                  Methodology reference: ACM0003 v9.0 (illustrative, not certified). This estimate is for demonstration only.
                </div>
              </div>
            </div>
            <div className="space-y-5">
              <SectionLabel>MRV and independent review</SectionLabel>
              <h2 id="mrv-heading" className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Calculation transparency, not black-box numbers.
              </h2>
              <p className="text-base leading-7 text-muted-foreground">
                Every MRV calculation shows its inputs, assumptions and steps. Default
                IPCC reference factors are used where plant-specific values are not
                available — and that uncertainty is flagged, not hidden.
              </p>
              <div className="space-y-2">
                {[
                  'ACM0003 v9.0 illustrative calculation structure',
                  'Default IPCC NCV and emission factors with source citations',
                  'Explicit warnings when assumptions are applied',
                  'Transport leakage calculated separately',
                  'Results labelled illustrative — not certified reductions',
                  'Reviewers record formal decision against each delivery',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 9. ENVIRONMENTAL ELIGIBILITY EXPLANATION ══════════════════════════ */}
      <section className="border-b border-border bg-muted/30" aria-labelledby="eligibility-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 space-y-3 text-center">
              <SectionLabel>Simulated issuance</SectionLabel>
              <h2 id="eligibility-heading" className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                What "eligible environmental assets" means here.
              </h2>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex gap-3 rounded-lg border border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)] p-3">
                <GitMerge className="mt-0.5 size-4 shrink-0 text-[color:var(--status-warning)]" aria-hidden />
                <p className="text-sm text-[color:var(--status-warning)]">
                  <strong>Eligibility is simulated and not assessed by a standards body.</strong>
                  {' '}The demonstration plant is explicitly hypothetical.
                </p>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                When an administrator marks a cement plant as <strong>eligible (simulated)</strong>,
                reviewed deliveries at that plant can be included in an <em>issuance batch</em>.
                A batch calculates the total net tCO₂e from frozen delivery snapshots and
                produces a whole-credit count using floor(total tCO₂e).
              </p>
              <p className="text-sm leading-7 text-muted-foreground">
                This action is labelled <strong>"Registry (simulated)"</strong> throughout the
                platform. No actual registry interaction occurs. No credits are issued to any
                external system. No real money changes hands. All allocation figures are
                placeholder values.
              </p>
              <div className="grid gap-3 sm:grid-cols-3 pt-2 border-t border-border">
                {[
                  { label: 'Plant eligibility', note: 'Assessed by platform admin' },
                  { label: 'Issuance batch', note: 'Admin-only, gated by eligibility' },
                  { label: 'Sale allocations', note: 'Simulated placeholder values' },
                ].map(({ label, note }) => (
                  <div key={label} className="rounded-lg border border-border p-3">
                    <p className="text-xs font-semibold text-foreground">{label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ 10. FINAL CTA ════════════════════════════════════════════════════ */}
      <section
        className="bg-sidebar"
        style={{
          backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(53,163,107,0.1) 0%, transparent 60%)',
        }}
        aria-labelledby="cta-heading"
      >
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 text-center">
          <h2 id="cta-heading" className="text-3xl font-semibold tracking-tight text-sidebar-foreground sm:text-4xl">
            Ready to trace your supply chain?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-sidebar-foreground/65">
            Register your organization, complete verification, and access your role-specific
            workspace.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="bg-[#35A36B] text-white hover:bg-[#35A36B]/90"
              onClick={handleGetStarted}
            >
              Get started
              <ArrowRight className="size-4" aria-hidden />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/60"
              asChild
            >
              <Link to="/how-it-works">Learn how it works</Link>
            </Button>
          </div>
          <p className="mt-6 text-xs text-sidebar-foreground/40">
            This is a prototype. Credit issuance is simulated. No real payments are processed.
          </p>
        </div>
      </section>

    </div>
  )
}
