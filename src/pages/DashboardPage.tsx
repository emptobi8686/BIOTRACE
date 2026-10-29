import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { RecentDeliveriesTable } from '@/components/dashboard/RecentDeliveriesTable'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useDeliveries } from '@/store/useDeliveries'
import { computeDashboardKpis, recentActivityFromDeliveries, toSampleDelivery } from '@/lib/metrics'
import { DEMO_BANNER } from '@/data/sample'

export function DashboardPage() {
  // All metrics derive from the same live store that drives DeliveriesPage.
  // Submitting or confirming a delivery will update every figure here.
  const deliveries = useDeliveries()

  const kpis = useMemo(() => computeDashboardKpis(deliveries), [deliveries])
  const recentActivity = useMemo(
    () => recentActivityFromDeliveries(deliveries, 6),
    [deliveries],
  )
  // Show the 5 most-recently-updated deliveries in the dashboard table.
  const recentDeliveries = useMemo(
    () =>
      [...deliveries]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
        .map(toSampleDelivery),
    [deliveries],
  )

  return (
    <>
      <Header
        title="Operations dashboard"
        subtitle="Nigeria biomass-to-cement demonstration workspace"
      />

      <main className="flex-1 space-y-6 px-4 py-6 sm:px-6">
        {/* Demo banner */}
        <div
          role="status"
          className="flex gap-3 rounded-lg border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>{DEMO_BANNER}</p>
        </div>

        {/* KPI cards */}
        <section aria-labelledby="kpi-heading">
          <div className="mb-3 flex items-end justify-between gap-2">
            <h2 id="kpi-heading" className="text-sm font-semibold text-foreground">
              Key metrics
            </h2>
            <p className="text-xs text-muted-foreground">
              Totals update live from the delivery store — no page refresh needed
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((metric) => (
              <KpiCard key={metric.id} metric={metric} />
            ))}
          </div>
        </section>

        {/* Recent deliveries + activity */}
        <div className="grid gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2" aria-labelledby="deliveries-heading">
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <h2
                  id="deliveries-heading"
                  className="text-sm font-semibold text-foreground"
                >
                  Recent deliveries
                </h2>
                <p className="text-xs text-muted-foreground">
                  5 most recently updated · declared weight ≠ final measured weight
                </p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/deliveries">View all</Link>
              </Button>
            </div>
            {recentDeliveries.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No deliveries yet.{' '}
                  <Link to="/deliveries/new" className="font-medium text-primary underline-offset-4 hover:underline">
                    Submit the first one.
                  </Link>
                </p>
              </div>
            ) : (
              <RecentDeliveriesTable deliveries={recentDeliveries} />
            )}
          </section>

          <section aria-labelledby="activity-heading">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle id="activity-heading" className="text-sm">
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
          </section>
        </div>

        {/* Prototype boundaries */}
        <section
          aria-labelledby="disclaimer-heading"
          className="rounded-lg border border-border bg-card px-4 py-4 text-sm text-muted-foreground"
        >
          <h2
            id="disclaimer-heading"
            className="mb-1 text-sm font-semibold text-foreground"
          >
            Prototype boundaries
          </h2>
          <ul className="list-inside list-disc space-y-1">
            <li>
              BIOTRACE is not an official carbon registry and does not issue real credits in this MVP.
            </li>
            <li>
              Emissions reduction is unavailable until an approved methodology, plant baseline data
              and independent review are connected.
            </li>
            <li>
              Marketplace figures are simulated demo transactions with no real money movement.
            </li>
            <li>
              Data is held in memory for this browser session only and resets on page refresh.
            </li>
          </ul>
        </section>
      </main>
    </>
  )
}
