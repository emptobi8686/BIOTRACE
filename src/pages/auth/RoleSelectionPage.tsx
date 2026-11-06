import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Layers,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { BiotraceMark } from '@/components/brand/BiotraceMark'
import { organizationTypes, signupRolePaths } from '@/lib/onboarding'

// All 5 org types with role-specific icons and descriptions
const roleConfig: Record<
  string,
  {
    icon: typeof Building2
    description: string
    detail: string
    highlight?: boolean
  }
> = {
  supplier: {
    icon: Layers,
    description: 'Register your sourcing business and participate in traceable biomass supply.',
    detail: 'Sourcing · Delivery submissions · Evidence',
    highlight: false,
  },
  biomass_aggregator: {
    icon: Truck,
    description: 'Aggregate biomass from multiple suppliers and coordinate consolidated shipments.',
    detail: 'Aggregation · Inventory · Shipments',
    highlight: false,
  },
  cement_plant: {
    icon: Building2,
    description: 'Record biomass deliveries, weighbridge data and plant utilization for MRV.',
    detail: 'Deliveries · Confirmation · Utilization',
    highlight: true,
  },
  independent_reviewer: {
    icon: ClipboardCheck,
    description: 'Submit accreditation information and independently review MRV evidence.',
    detail: 'Evidence review · MRV · Decisions',
    highlight: false,
  },
  carbon_buyer: {
    icon: ShoppingBag,
    description: 'Access eligible environmental assets with full traceability to source.',
    detail: 'Projects · Assets · Transactions',
    highlight: false,
  },
}

export function RoleSelectionPage() {
  return (
    <div className="min-h-svh bg-background">
      {/* ── Header bar ─────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-widest text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BiotraceMark className="size-4" />
            </span>
            BIOTRACE
          </Link>
          <p className="text-sm text-muted-foreground">
            Already registered?{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Page heading */}
        <div className="mx-auto mb-10 max-w-2xl space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Get started
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Choose your organization type
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            One BIOTRACE account. Select the organization you represent to begin onboarding.
          </p>
        </div>

        {/* 5-up org type grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {organizationTypes.map(({ value, label }) => {
            const config = roleConfig[value]
            if (!config) return null
            const Icon = config.icon
            const rolePath = signupRolePaths[value as keyof typeof signupRolePaths]
            // Handle query-param paths for aggregator/buyer
            const to = rolePath.includes('?')
              ? `/signup/${rolePath}`
              : `/signup/${rolePath}`

            return (
              <Link
                key={value}
                to={to}
                className={`
                  group flex flex-col rounded-xl border p-5 transition-all
                  hover:border-primary/50 hover:shadow-sm
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                  ${config.highlight
                    ? 'border-primary/30 bg-primary/[0.02]'
                    : 'border-border bg-card'}
                `}
              >
                {/* Icon */}
                <span
                  className={`
                    mb-4 flex size-10 items-center justify-center rounded-lg transition-colors
                    ${config.highlight
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary'}
                  `}
                >
                  <Icon className="size-5" aria-hidden />
                </span>

                {/* Label */}
                <h2 className="mb-1.5 text-sm font-semibold text-foreground">{label}</h2>

                {/* Description */}
                <p className="mb-3 flex-1 text-xs leading-5 text-muted-foreground">
                  {config.description}
                </p>

                {/* Capabilities pill */}
                <p className="mb-4 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
                  {config.detail}
                </p>

                {/* CTA */}
                <span
                  className={`
                    flex items-center gap-1 text-xs font-medium transition-colors
                    ${config.highlight ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}
                  `}
                >
                  Register
                  <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            )
          })}
        </div>

        {/* Footer note */}
        <p className="mt-10 text-center text-xs text-muted-foreground">
          All registrations are reviewed by a BIOTRACE administrator before access is granted.
          Creating an account does not automatically confer platform access.
        </p>
      </main>
    </div>
  )
}
