import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, TrendingUp, Clock, CheckCircle2, FileSearch } from 'lucide-react'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { RecentDeliveriesTable } from '@/components/dashboard/RecentDeliveriesTable'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDeliveries } from '@/store/useDeliveries'
import { computeDashboardKpis, recentActivityFromDeliveries, toSampleDelivery } from '@/lib/metrics'
import { useDemoSession } from '@/lib/demo-session'
import { roleLabel } from '@/lib/labels'
import type { KpiMetric } from '@/types'
import type { UserRole } from '@/types'

const DEMO_BANNER =
  'Sample data only — values are illustrative and not certified carbon credits or real transactions.'

// ─── Role-specific KPI selectors ─────────────────────────────────────────────
function selectKpisForRole(allKpis: KpiMetric[], role: UserRole): KpiMetric[] {
  switch (role) {
    case 'supplier':
      return allKpis.filter((k) =>
        ['biomass-delivered', 'awaiting-confirmation', 'reviewed-deliveries'].includes(k.id),
      )
    case 'plant_operator':
      return allKpis.filter((k) =>
        ['biomass-delivered', 'awaiting-confirmation', 'awaiting-review'].includes(k.id),
      )
    case 'reviewer':
      return allKpis.filter((k) =>
        ['awaiting-review', 'reviewed-deliveries', 'emissions-estimate'].includes(k.id),
      )
    case 'buyer':
      return allKpis.filter((k) =>
        ['reviewed-deliveries', 'emissions-estimate', 'sim-marketplace'].includes(k.id),
      )
    case 'administrator':
      return allKpis // all 6
    default:
      return allKpis.slice(0, 3)
  }
}

// ─── Role-specific dashboard subtitle ────────────────────────────────────────
function getDashboardContext(role: UserRole) {
  switch (role) {
    case 'supplier':
      return {
        subtitle: 'Delivery submissions and supply history',
        primaryAction: { label: 'Submit a delivery', to: '/deliveries/new' },
        primaryActionLabel: 'New delivery',
      }
    case 'plant_operator':
      return {
        subtitle: 'Incoming deliveries and plant confirmation',
        primaryAction: { label: 'View deliveries', to: '/deliveries' },
        primaryActionLabel: 'Deliveries',
      }
    case 'reviewer':
      return {
        subtitle: 'Review queue and MRV evidence',
        primaryAction: { label: 'Open review queue', to: '/review' },
        primaryActionLabel: 'Review queue',
      }
    case 'buyer':
      return {
        subtitle: 'Eligible projects and environmental assets',
        primaryAction: { label: 'Explore marketplace', to: '/marketplace' },
        primaryActionLabel: 'Marketplace',
      }
    case 'administrator':
      return {
        subtitle: 'Platform overview and organization management',
        primaryAction: { label: 'Organization verification', to: '/admin' },
        primaryActionLabel: 'Admin portal',
      }
    default:
      return {
        subtitle: 'Biomass supply and delivery overview',
        primaryAction: { label: 'View deliveries', to: '/deliveries' },
        primaryActionLabel: 'Deliveries',
      }
  }
}

// ─── Role-specific status summary chips ──────────────────────────────────────
function StatusSummary({ role, deliveries }: { role: UserRole; deliveries: ReturnType<typeof useDeliveries> }) {
  const pending = deliveries.filter((d) => d.status === 'pending_plant_confirmation').length
  const awaitingReview = deliveries.filter(
    (d) => d.status === 'awaiting_review' || d.status === 'corrections_requested',
  ).length
  const confirmed = deliveries.filter((d) => d.status === 'confirmed').length
  const reviewed = deliveries.filter((d) => d.status === 'reviewed').length

  const items: Array<{ label: string; count: number; style: string; icon: typeof Clock }> = []

  if (role === 'supplier' || role === 'administrator') {
    items.push({ label: 'Pending confirmation', count: pending, style: 'status-badge--pending', icon: Clock })
    items.push({ label: 'Awaiting review', count: awaitingReview, style: 'status-badge--info', icon: FileSearch })
    items.push({ label: 'Evidence reviewed', count: reviewed, style: 'status-badge--verified', icon: CheckCircle2 })
  } else if (role === 'plant_operator') {
    items.push({ label: 'Awaiting confirmation', count: pending, style: 'status-badge--pending', icon: Clock })
    items.push({ label: 'Confirmed', count: confirmed, style: 'status-badge--success', icon: CheckCircle2 })
    items.push({ label: 'In review', count: awaitingReview, style: 'status-badge--info', icon: FileSearch })
  } else if (role === 'reviewer') {
    items.push({ label: 'Needs review', count: awaitingReview, style: 'status-badge--warning', icon: Clock })
    items.push({ label: 'Reviewed', count: reviewed, style: 'status-badge--verified', icon: CheckCircle2 })
  } else if (role === 'buyer') {
    items.push({ label: 'Reviewed deliveries', count: reviewed, style: 'status-badge--verified', icon: CheckCircle2 })
  }

  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const IconComp = item.icon
        return (
          <span key={item.label} className={`status-badge ${item.style}`}>
            <IconComp className="size-3" aria-hidden />
            <span className="font-semibold">{item.count}</span>
            <span className="text-xs">{item.label}</span>
          </span>
        )
      })}
    </div>
  )
}

// ─── Reviewer-specific insight panel ─────────────────────────────────────────
function ReviewerPanel({ deliveries }: { deliveries: ReturnType<typeof useDeliveries> }) {
  const queue = deliveries.filter(
    (d) => d.status === 'awaiting_review' || d.status === 'corrections_requested',
  )
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Review queue summary</CardTitle>
      </CardHeader>
      <CardContent>
        {queue.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            Queue is empty — no deliveries awaiting review.
          </div>
        ) : (
          <div className="space-y-3">
            {queue.slice(0, 4).map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{d.reference}</p>
                  <p className="truncate text-xs text-muted-foreground">{d.supplierName}</p>
                </div>
                <Link
                  to={`/review/${d.id}`}
                  className="shrink-0 text-xs font-medium text-primary hover:underline"
                >
                  Review
                </Link>
              </div>
            ))}
            {queue.length > 4 && (
              <Link
                to="/review"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View all {queue.length} items
                <ArrowRight className="size-3" aria-hidden />
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Buyer-specific information panel ────────────────────────────────────────
function BuyerPanel() {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Environmental asset status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">No eligible assets available yet</p>
          <p className="mt-1">
            Environmental assets are only listed after independent review of biomass utilization
            records. Reviewed reductions are not equal to issued credits.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to="/marketplace">Browse marketplace</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── DashboardPage ────────────────────────────────────────────────────────────
export function DashboardPage() {
  const deliveries = useDeliveries()
  const { role } = useDemoSession()

  const allKpis = useMemo(() => computeDashboardKpis(deliveries), [deliveries])
  const kpis = useMemo(() => selectKpisForRole(allKpis, role), [allKpis, role])

  const recentActivity = useMemo(
    () => recentActivityFromDeliveries(deliveries, 6),
    [deliveries],
  )

  const recentDeliveries = useMemo(
    () =>
      [...deliveries]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
        .map(toSampleDelivery),
    [deliveries],
  )

  const context = getDashboardContext(role)

  return (
    <>
      <Header
        title="Dashboard"
        subtitle={context.subtitle}
      />

      <main className="flex-1 space-y-5 px-4 py-5 sm:px-6">

        {/* Demo banner */}
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)] px-4 py-2.5 text-xs text-[color:var(--status-warning)]"
        >
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <p>{DEMO_BANNER}</p>
        </div>

        {/* Role identity strip */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm font-medium text-foreground">{roleLabel(role)}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Demo mode
            </span>
          </div>
          <StatusSummary role={role} deliveries={deliveries} />
        </div>

        {/* KPI cards */}
        <section aria-labelledby="kpi-heading">
          <div className="mb-2.5 flex items-end justify-between gap-2">
            <h2 id="kpi-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Key metrics
            </h2>
            <p className="text-xs text-muted-foreground">
              Updates live from the delivery store
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((metric) => (
              <KpiCard key={metric.id} metric={metric} />
            ))}
          </div>
        </section>

        {/* Main content grid */}
        <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-3">

          {/* Recent deliveries — 2/3 width */}
          {role !== 'buyer' && (
            <section className="min-w-0 xl:col-span-2" aria-labelledby="deliveries-heading">
              <div className="mb-2.5 flex items-end justify-between gap-2">
                <div>
                  <h2 id="deliveries-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Recent deliveries
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    5 most recently updated · declared ≠ measured weight
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/deliveries">View all</Link>
                </Button>
              </div>

              {recentDeliveries.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-12 text-center">
                  <TrendingUp className="mb-3 size-8 text-muted-foreground/40" aria-hidden />
                  <p className="text-sm font-medium text-foreground">No deliveries yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {role === 'supplier' || role === 'administrator'
                      ? 'Submit the first delivery to get started.'
                      : 'Deliveries will appear here once submitted.'}
                  </p>
                  {(role === 'supplier' || role === 'administrator') && (
                    <Button asChild size="sm" className="mt-4">
                      <Link to="/deliveries/new">Submit a delivery</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <RecentDeliveriesTable deliveries={recentDeliveries} />
              )}
            </section>
          )}

          {/* Side panel — role-specific */}
          <section className={`min-w-0 space-y-4 ${role === 'buyer' ? 'xl:col-span-3 max-w-xl' : ''}`} aria-labelledby="side-heading">
            {/* Activity timeline */}
            <Card className="shadow-none">
              <CardHeader className="pb-3">
                <CardTitle id="side-heading" className="text-sm">
                  Recent activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  <ActivityTimeline events={recentActivity} />
                )}
              </CardContent>
            </Card>

            {/* Role-specific supplementary panels */}
            {role === 'reviewer' && (
              <ReviewerPanel deliveries={deliveries} />
            )}
            {role === 'buyer' && (
              <BuyerPanel />
            )}
          </section>
        </div>

        {/* Prototype boundaries — administrator and reviewer context */}
        {(role === 'administrator' || role === 'reviewer') && (
          <section
            aria-labelledby="boundaries-heading"
            className="rounded-lg border border-border bg-card px-4 py-4"
          >
            <h2
              id="boundaries-heading"
              className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Prototype boundaries
            </h2>
            <ul className="space-y-1 text-xs text-muted-foreground list-inside list-disc">
              <li>BIOTRACE is not an official carbon registry and does not issue real credits in this prototype.</li>
              <li>Emissions reduction is unavailable until an approved methodology and plant baseline are connected.</li>
              <li>Marketplace figures are simulated demo transactions with no real money movement.</li>
              <li>Data is held in memory for this browser session and resets on page refresh.</li>
            </ul>
          </section>
        )}

        {/* Primary CTA for current role */}
        <div className="flex justify-end">
          <Button asChild variant="outline" size="sm">
            <Link to={context.primaryAction.to}>
              {context.primaryAction.label}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </main>
    </>
  )
}
