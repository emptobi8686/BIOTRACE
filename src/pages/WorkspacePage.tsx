import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Layers,
  ShoppingBag,
  Truck,
  CheckCircle2,
} from 'lucide-react'
import { FormMessage, LoadingSpinner } from '@/components/auth/AuthFrame'
import { BiotraceMark } from '@/components/brand/BiotraceMark'
import { Button } from '@/components/ui/button'
import { organizationTypeLabel, verificationStatusLabel } from '@/lib/onboarding'
import { getMyOrganizations, type OnboardingOrganization } from '@/lib/organizations'
import { useAuth } from '@/lib/use-auth'
import type { LucideIcon } from 'lucide-react'

const orgConfig: Record<
  string,
  {
    icon: LucideIcon
    headline: string
    tagline: string
    actions: Array<{ label: string; to: string; primary?: boolean }>
    features: string[]
  }
> = {
  supplier: {
    icon: Layers,
    headline: 'Biomass supplier workspace',
    tagline: 'Submit deliveries, upload evidence and track supply history.',
    actions: [
      { label: 'Submit a delivery', to: '/deliveries/new', primary: true },
      { label: 'View deliveries', to: '/deliveries' },
    ],
    features: ['Delivery submissions', 'Evidence uploads', 'Supply history', 'Organization profile'],
  },
  biomass_aggregator: {
    icon: Truck,
    headline: 'Aggregator workspace',
    tagline: 'Coordinate supplier networks, track inventory and manage consolidated shipments.',
    actions: [
      { label: 'View deliveries', to: '/deliveries', primary: true },
      { label: 'Submit a delivery', to: '/deliveries/new' },
    ],
    features: ['Supplier network', 'Inventory overview', 'Consolidated shipments', 'Supply history'],
  },
  cement_plant: {
    icon: Building2,
    headline: 'Cement plant workspace',
    tagline: 'Confirm incoming deliveries, record weighbridge data and track biomass utilization.',
    actions: [
      { label: 'View deliveries', to: '/deliveries', primary: true },
      { label: 'Plant weighing', to: '/plant' },
    ],
    features: ['Delivery confirmation', 'Weighbridge records', 'Biomass utilization', 'MRV overview'],
  },
  independent_reviewer: {
    icon: ClipboardCheck,
    headline: 'Auditor workspace',
    tagline: 'Review evidence packages, record MRV findings and issue review decisions.',
    actions: [
      { label: 'Open review queue', to: '/review', primary: true },
    ],
    features: ['Review queue', 'Evidence inspection', 'MRV calculations', 'Review decisions'],
  },
  carbon_buyer: {
    icon: ShoppingBag,
    headline: 'Carbon buyer workspace',
    tagline: 'Explore eligible projects with full traceability to biomass source.',
    actions: [
      { label: 'Explore marketplace', to: '/marketplace', primary: true },
      { label: 'View projects', to: '/projects' },
    ],
    features: ['Eligible projects', 'Environmental performance', 'Asset availability', 'Purchase history'],
  },
}

export function WorkspacePage() {
  const { organizationId } = useParams()
  const { session } = useAuth()
  const [organization, setOrganization] = useState<OnboardingOrganization | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let active = true
    if (!session || !organizationId) return

    void getMyOrganizations(session.user.id)
      .then((orgs) => {
        if (!active) return
        const found = orgs.find((o) => o.id === organizationId) ?? null
        setOrganization(found)
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : 'Unable to load your organization.')
      })
      .finally(() => { if (active) setIsLoading(false) })

    return () => { active = false }
  }, [organizationId, session])

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <LoadingSpinner label="Loading workspace…" />
      </div>
    )
  }

  if (error || !organization || organization.verificationStatus !== 'approved') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center gap-2.5 text-primary">
            <BiotraceMark className="size-8" />
            <span className="text-lg font-semibold tracking-widest">BIOTRACE</span>
          </div>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h1 className="text-lg font-semibold">Workspace unavailable</h1>
            <FormMessage kind="error">
              {error ??
                'This organization is not available to your account or has not been approved.'}
            </FormMessage>
            <Button asChild variant="outline" className="w-full">
              <Link to="/onboarding">Back to onboarding</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const config = orgConfig[organization.organizationType]
  const Icon = config?.icon ?? Building2

  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">

        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/onboarding" className="hover:text-primary hover:underline focus-visible:outline-none">
            Organizations
          </Link>
          <span aria-hidden>/</span>
          <span className="text-foreground font-medium">{organization.name}</span>
        </nav>

        {/* Workspace header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-6" aria-hidden />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">{organization.name}</h1>
                <span className="status-badge status-badge--success">
                  <CheckCircle2 className="size-3" aria-hidden />
                  Approved
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {organizationTypeLabel(organization.organizationType)} · Organization workspace
              </p>
              {config && (
                <p className="mt-1 text-sm text-muted-foreground">{config.tagline}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/onboarding">Organizations</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Primary actions */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Quick actions</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {config?.actions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className={`
                    group flex items-center justify-between rounded-xl border p-4 transition-all
                    hover:border-primary/50 hover:shadow-sm
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                    ${action.primary
                      ? 'border-primary/30 bg-primary/[0.03]'
                      : 'border-border bg-card'}
                  `}
                >
                  <span className={`text-sm font-medium ${action.primary ? 'text-primary' : 'text-foreground'}`}>
                    {action.label}
                  </span>
                  <ArrowRight
                    className={`size-4 transition-transform group-hover:translate-x-0.5 ${action.primary ? 'text-primary' : 'text-muted-foreground'}`}
                    aria-hidden
                  />
                </Link>
              ))}
            </div>

            {/* Availability note */}
            <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
              Some features arrive in future milestones and will display a coming-soon notice
              when visited. Your workspace access and membership are active.
            </div>
          </div>

          {/* Workspace features */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Available features</h2>
            <div className="rounded-xl border border-border bg-card p-4">
              <ul className="space-y-2.5">
                {config?.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                    </span>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Org details */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Organization
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Type</dt>
                  <dd className="text-right font-medium text-foreground">
                    {organizationTypeLabel(organization.organizationType)}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="text-right font-medium text-foreground">
                    {verificationStatusLabel(organization.verificationStatus ?? 'pending')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
