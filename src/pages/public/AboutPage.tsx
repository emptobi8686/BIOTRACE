import { Link } from 'react-router-dom'
import { ArrowRight, AlertTriangle, CheckCircle2, GitMerge } from 'lucide-react'
import { BiotraceMark } from '@/components/brand/BiotraceMark'
import { Button } from '@/components/ui/button'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{children}</p>
  )
}

export function AboutPage() {
  return (
    <div>
      {/* Header */}
      <section className="border-b border-border bg-sidebar" aria-labelledby="about-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <SectionLabel>About</SectionLabel>
            <h1 id="about-heading" className="mt-2 text-4xl font-semibold tracking-tight text-sidebar-foreground sm:text-5xl">
              About BIOTRACE
            </h1>
            <p className="mt-4 text-lg leading-8 text-sidebar-foreground/65">
              A climate-fintech infrastructure prototype for traceable biomass supply chains.
            </p>
          </div>
        </div>
      </section>

      {/* What BIOTRACE is */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 space-y-8">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-4">
              <SectionLabel>What it is</SectionLabel>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                A prototype platform for biomass traceability and transparent MRV.
              </h2>
              <p className="text-sm leading-7 text-muted-foreground">
                BIOTRACE is a prototype climate-fintech application exploring how biomass
                supply chains connecting suppliers, aggregators, cement plants, independent
                reviewers and carbon-market participants can be made traceable and auditable.
              </p>
              <p className="text-sm leading-7 text-muted-foreground">
                It provides end-to-end delivery records, plant-confirmed weighbridge measurements,
                structured evidence packages, illustrative MRV calculations and independent review
                workflows — all in a single system with an append-only audit trail.
              </p>
            </div>

            <div className="space-y-4">
              <SectionLabel>What it is not</SectionLabel>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                Not a carbon registry. Not a payment processor.
              </h2>
              <div className="space-y-2">
                {[
                  'BIOTRACE is not an official carbon registry.',
                  'It does not issue real carbon credits.',
                  'It does not process real payments.',
                  'Plant eligibility is assessed by platform administrators, not accredited standards bodies.',
                  'MRV outputs are illustrative and not validated under CDM, Gold Standard or Verra.',
                  'Sale allocation figures are placeholder simulations.',
                  'No registry interaction occurs when a batch is "issued".',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[color:var(--status-warning)]" aria-hidden />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The context */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 space-y-6">
          <SectionLabel>Context</SectionLabel>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground max-w-2xl">
            The problem BIOTRACE is designed to address.
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Cement and climate</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Cement production accounts for approximately 7–8% of global CO₂ emissions.
                Replacing fossil fuels in cement kilns with waste biomass is a credible
                near-term decarbonisation pathway — particularly where agricultural residues
                are abundant.
              </p>
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">The traceability gap</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Without a structured system, supplier declarations are unverifiable,
                plant measurements are disconnected from supply records, reviewers
                lack structured evidence access, and the link between delivered
                biomass and any emissions benefit is entirely opaque.
              </p>
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Nigeria context</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                This prototype uses Nigeria as its operational context — a country with
                significant agricultural residue supply (palm kernel shells, rice husks,
                cocoa husks, cotton stalks), a large cement industry, and a developing
                voluntary carbon market ecosystem.
              </p>
            </div>
            <div className="space-y-3 rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Why infrastructure matters</h3>
              <p className="text-sm leading-6 text-muted-foreground">
                Climate integrity depends on auditability. A traceable record system
                does not by itself produce carbon credits — but it provides the
                foundational evidence layer that rigorous verification requires.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Technology */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 space-y-6">
          <SectionLabel>Technology</SectionLabel>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground max-w-2xl">
            Built on modern, open infrastructure.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'React 19 + Vite 8', note: 'Frontend application' },
              { label: 'TypeScript', note: 'Type-safe throughout' },
              { label: 'React Router 7', note: 'Client-side routing' },
              { label: 'Supabase (PostgreSQL)', note: 'Database, auth, storage' },
              { label: 'Row Level Security', note: 'All 20+ tables RLS-enabled' },
              { label: 'SECURITY DEFINER RPCs', note: 'All writes via trusted functions' },
              { label: 'Tailwind CSS v4', note: 'Utility-first styling' },
              { label: 'shadcn/ui', note: 'Accessible component system' },
              { label: 'Google OAuth', note: 'Via Supabase Auth' },
            ].map(({ label, note }) => (
              <div key={label} className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3">
                <CheckCircle2 className="size-4 shrink-0 text-primary/60" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-xs text-muted-foreground">{note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security and integrity principles */}
      <section className="border-b border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 space-y-6">
          <SectionLabel>Integrity principles</SectionLabel>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground max-w-2xl">
            How BIOTRACE protects data integrity.
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                title: 'Append-only audit records',
                detail: 'Delivery history, review decisions, plant confirmations and audit logs are append-only with database-level triggers blocking modification.',
              },
              {
                title: 'No silent state changes',
                detail: 'Every workflow transition records actor identity, role, timestamp and a note. Nothing changes without a traceable entry.',
              },
              {
                title: 'Backend-enforced authorization',
                detail: 'All sensitive writes go through SECURITY DEFINER RPC functions that validate the caller\'s identity, role and organizational membership before executing.',
              },
              {
                title: 'Frozen calculation snapshots',
                detail: 'Issuance batches store immutable snapshots of the delivery data used in calculations. Historical records cannot be silently altered by future data changes.',
              },
              {
                title: 'RLS on every table',
                detail: 'All 20+ tables have Row Level Security enabled. No anonymous or unauthenticated reads. Scope enforced by org membership and approval status.',
              },
              {
                title: 'Reviewer conflict prevention',
                detail: 'Reviewers cannot review deliveries from their own organization. Conflict-of-interest declarations are required before assignment.',
              },
            ].map(({ title, detail }) => (
              <div key={title} className="space-y-2 rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <GitMerge className="size-4 text-primary" aria-hidden />
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logo / brand note */}
      <section className="border-b border-border bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="flex flex-col items-center gap-6 text-center">
            <span className="flex size-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <BiotraceMark className="size-12" />
            </span>
            <div className="max-w-lg space-y-2">
              <h2 className="text-xl font-semibold text-foreground">The BIOTRACE mark</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                The geometric B mark is built from a vertical spine with two arcs and
                accent nodes at each tip — communicating connected supply chains and
                verified movement without a generic leaf or globe symbol.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-sidebar">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 text-center">
          <p className="text-lg font-semibold text-sidebar-foreground">
            Explore the platform
          </p>
          <p className="mt-2 text-sm text-sidebar-foreground/60">
            Register your organization and complete verification to access your workspace.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild className="bg-[#35A36B] text-white hover:bg-[#35A36B]/90">
              <Link to="/signup">
                Get started
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent/60">
              <Link to="/how-it-works">How it works</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
