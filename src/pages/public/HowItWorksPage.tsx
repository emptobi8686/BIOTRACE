import { Link } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Layers,
  Truck,
  Scale,
  FlaskConical,
  ClipboardCheck,
  GitMerge,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const WORKFLOW_STAGES = [
  {
    icon: Layers,
    step: 1,
    title: 'Biomass sourcing',
    role: 'Supplier / Aggregator',
    color: 'bg-primary/10 text-primary',
    description:
      'A biomass supplier or aggregator registers their organization on BIOTRACE. They describe biomass categories, sourcing locations and available supply capacity. This information is reviewed by a platform administrator before any operational access is granted.',
    keyPoints: [
      'Organization registration with business identity verification',
      'CAC registration number cross-checked via FastCAC',
      'Administrator review before workspace access is granted',
      'Sourcing information is applicant-provided, not independently verified',
    ],
    distinction: null,
  },
  {
    icon: Truck,
    step: 2,
    title: 'Delivery declaration',
    role: 'Supplier / Aggregator',
    color: 'bg-primary/10 text-primary',
    description:
      'When a biomass load is dispatched, the supplier or aggregator creates a delivery record. They declare the biomass type, origin location, weight and attach evidence documents — delivery notes, transport documentation and photographs.',
    keyPoints: [
      'Biomass type, origin and declared weight recorded',
      'Vehicle reference and delivery date captured',
      'Supporting evidence files attached at declaration',
      'Unique reference generated per delivery',
    ],
    distinction: {
      label: 'Declared weight ≠ measured weight',
      detail:
        'The declared weight is the supplier\'s estimate. It is never used as the operational or climate figure. The plant\'s weighbridge measurement replaces it.',
    },
  },
  {
    icon: Scale,
    step: 3,
    title: 'Plant weighbridge confirmation',
    role: 'Cement plant operator',
    color: 'bg-primary/10 text-primary',
    description:
      'When the load arrives, the plant operator records the actual weight from the weighbridge. They either confirm the delivery or dispute it with a documented reason. Confirmed deliveries can be forwarded for independent review.',
    keyPoints: [
      'Measured weight recorded from plant weighbridge',
      'Weighing ticket attached as evidence',
      'Decision: confirm or dispute with reason',
      'Weight discrepancies flagged and retained in the record',
    ],
    distinction: {
      label: 'Accepted ≠ consumed',
      detail:
        'Accepting a delivery at the plant does not confirm that the biomass was combusted in the kiln. Utilization is tracked separately.',
    },
  },
  {
    icon: FlaskConical,
    step: 4,
    title: 'Biomass utilization and MRV',
    role: 'Cement plant / Platform',
    color: 'bg-primary/10 text-primary',
    description:
      'The plant records actual biomass consumed during kiln operations. An illustrative MRV calculation is performed using IPCC reference factors and plant-specific inputs where available. All inputs, assumptions and steps are shown.',
    keyPoints: [
      'Actual utilization recorded separately from delivery acceptance',
      'ACM0003 v9.0 calculation structure used as illustrative reference',
      'Default IPCC NCV and emission factors cited by source',
      'Transport leakage calculated when distance is provided',
      'All assumptions flagged as warnings, not hidden',
    ],
    distinction: {
      label: 'Estimated reduction ≠ verified reduction',
      detail:
        'The MRV output is an illustrative estimate. It has not been validated under any recognised carbon standard and cannot be used to issue real credits.',
    },
  },
  {
    icon: ClipboardCheck,
    step: 5,
    title: 'Independent review',
    role: 'Independent reviewer',
    color: 'bg-[color:var(--status-info-subtle)] text-[color:var(--status-info)]',
    description:
      'An assigned independent reviewer inspects the complete evidence package: delivery records, weighing tickets, utilization data and MRV inputs. They record a formal decision — approval, corrections requested, or rejection — with a written note.',
    keyPoints: [
      'Reviewer has full access to the evidence package',
      'Conflict-of-interest declaration required before assignment',
      'Reviewer organization must not be the supplier or plant',
      'Decision recorded as append-only audit entry',
      'Corrections loop preserves full history',
    ],
    distinction: {
      label: 'Reviewed ≠ credited',
      detail:
        'A review decision records that evidence was examined. It does not constitute formal verification under any registry standard and does not trigger automatic credit issuance.',
    },
  },
  {
    icon: GitMerge,
    step: 6,
    title: 'Plant eligibility assessment',
    role: 'Administrator',
    color: 'bg-[color:var(--status-warning-subtle)] text-[color:var(--status-warning)]',
    description:
      'Before any issuance batch can be created, a platform administrator must assess the cement plant\'s eligibility. This records baseline fuel mix, alternative fuel history, investment evidence and biomass baseline fate.',
    keyPoints: [
      'Assessment is administrator-only and cannot be self-declared',
      'Eligibility status: not assessed, eligible (simulated), or blocked',
      'Assessment history is preserved',
      'Issue batch is blocked at the database level if plant is not eligible_simulated',
    ],
    distinction: {
      label: 'Eligibility is simulated',
      detail:
        'Eligibility assessment in this prototype is conducted by BIOTRACE administrators, not by an accredited standards body. It does not constitute formal methodology approval.',
    },
  },
  {
    icon: ShieldCheck,
    step: 7,
    title: 'Simulated issuance batch',
    role: 'Administrator',
    color: 'bg-[color:var(--status-warning-subtle)] text-[color:var(--status-warning)]',
    description:
      'An administrator creates an issuance batch covering a plant and reporting period. Eligible reviewed deliveries are selected. The total net tCO₂e is calculated from frozen snapshots. Whole credits are calculated using floor(total tCO₂e).',
    keyPoints: [
      'One batch per plant per reporting period',
      'Each delivery can appear in at most one batch',
      'Calculation uses frozen delivery snapshots — immutable after issuance',
      'Batches below 1 tCO₂e cannot be issued',
      'Issuance writes an audit log entry',
      'Labelled "Registry (simulated)" throughout',
    ],
    distinction: {
      label: 'Registry (simulated)',
      detail:
        'No real registry interaction occurs. No credits are issued to any external system. All issuance figures are illustrative placeholder values.',
    },
  },
]

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{children}</p>
  )
}

export function HowItWorksPage() {
  return (
    <div>
      {/* Page header */}
      <section className="border-b border-border bg-sidebar" aria-labelledby="hiw-heading">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-2xl">
            <SectionLabel>Workflow</SectionLabel>
            <h1 id="hiw-heading" className="mt-2 text-4xl font-semibold tracking-tight text-sidebar-foreground sm:text-5xl">
              How BIOTRACE works.
            </h1>
            <p className="mt-4 text-lg leading-8 text-sidebar-foreground/65">
              Seven stages from biomass sourcing to simulated issuance — every step
              traceable, every distinction preserved.
            </p>
          </div>
        </div>
      </section>

      {/* Important distinctions banner */}
      <div className="border-b border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)]">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[color:var(--status-warning)]" aria-hidden />
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[color:var(--status-warning)]">
              <span><strong>Declared ≠ Measured</strong></span>
              <span><strong>Accepted ≠ Consumed</strong></span>
              <span><strong>Estimated ≠ Verified</strong></span>
              <span><strong>Reviewed ≠ Credited</strong></span>
              <span><strong>Eligibility is simulated</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Stages */}
      <section className="bg-background">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 space-y-0">
          {WORKFLOW_STAGES.map((stage, idx) => {
            const Icon = stage.icon
            const isLast = idx === WORKFLOW_STAGES.length - 1
            return (
              <div key={stage.step} className="flex gap-6">
                {/* Step indicator column */}
                <div className="flex flex-col items-center">
                  <span
                    className={`flex size-12 shrink-0 items-center justify-center rounded-xl border border-border ${stage.color}`}
                  >
                    <Icon className="size-5" aria-hidden />
                  </span>
                  {!isLast && (
                    <div className="mt-2 h-full w-px bg-border" aria-hidden />
                  )}
                </div>

                {/* Content */}
                <div className={`min-w-0 pb-12 ${isLast ? '' : ''}`}>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Step {stage.step}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {stage.role}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3">
                    {stage.title}
                  </h2>
                  <p className="text-sm leading-7 text-muted-foreground mb-4">
                    {stage.description}
                  </p>

                  <ul className="mb-4 space-y-1.5">
                    {stage.keyPoints.map((point) => (
                      <li key={point} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary/70" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>

                  {stage.distinction && (
                    <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
                      <p className="text-xs font-semibold text-foreground">{stage.distinction.label}</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                        {stage.distinction.detail}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 text-center">
          <p className="text-lg font-semibold text-foreground">Ready to participate?</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Register your organization and complete verification to access your workspace.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/signup">
                Get started
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/about">About BIOTRACE</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
