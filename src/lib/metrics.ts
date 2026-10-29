import type { ActivityEvent, Delivery, KpiMetric, SampleDelivery } from '@/types'

export function toSampleDelivery(delivery: Delivery): SampleDelivery {
  return {
    id: delivery.id,
    reference: delivery.reference,
    supplier: delivery.supplierName,
    plant: delivery.plantName,
    biomassType: delivery.biomassType,
    declaredQuantityT: delivery.declaredQuantityT,
    measuredQuantityT: delivery.measuredQuantityT,
    status: delivery.status,
    deliveryDate: delivery.deliveryDate,
    location: delivery.originLocation,
  }
}

/** Derives dashboard KPI cards from the same in-memory delivery list as the UI. */
export function computeDashboardKpis(deliveries: Delivery[]): KpiMetric[] {
  // Use measured weight where available; fall back to declared for
  // deliveries still awaiting plant confirmation.
  const totalDeliveredT = deliveries.reduce((sum, d) => {
    return sum + (d.measuredQuantityT ?? d.declaredQuantityT)
  }, 0)

  const awaitingConfirmation = deliveries.filter(
    (d) => d.status === 'pending_plant_confirmation',
  ).length

  const awaitingReview = deliveries.filter(
    (d) => d.status === 'awaiting_review' || d.status === 'corrections_requested',
  ).length

  const reviewedCount = deliveries.filter((d) => d.status === 'reviewed').length

  return [
    {
      id: 'biomass-delivered',
      label: 'Recorded delivery weight',
      value:
        totalDeliveredT > 0
          ? `${totalDeliveredT.toLocaleString('en-NG', { maximumFractionDigits: 1 })} t`
          : '0 t',
      helper: `Measured weight where recorded; otherwise declared weight · ${deliveries.length} ${deliveries.length === 1 ? 'delivery' : 'deliveries'}`,
      impactLabel: 'estimated',
      trend: deliveries.length > 0 ? undefined : undefined,
    },
    {
      id: 'awaiting-confirmation',
      label: 'Awaiting plant confirmation',
      value: String(awaitingConfirmation),
      helper:
        awaitingConfirmation === 0
          ? 'No deliveries waiting'
          : 'Declared weight not yet weighed at plant',
      impactLabel: 'estimated',
    },
    {
      id: 'awaiting-review',
      label: 'Waiting for an independent checker',
      value: String(awaitingReview),
      helper:
        awaitingReview === 0
          ? 'No deliveries in review queue'
          : 'Awaiting review or corrections — includes flagged deliveries',
      impactLabel: 'estimated',
    },
    {
      id: 'emissions-estimate',
      label: 'Emissions reduction',
      value: 'Unavailable',
      helper: 'No approved methodology or plant baseline is connected',
      impactLabel: 'estimated',
    },
    {
      id: 'reviewed-deliveries',
      label: 'Evidence reviewed',
      value: String(reviewedCount),
      helper:
        reviewedCount === 0
          ? 'No deliveries have completed evidence review'
          : 'Reviewer sign-off recorded — does not equal credit issuance',
      impactLabel: reviewedCount > 0 ? 'reviewed' : 'estimated',
    },
    {
      id: 'sim-marketplace',
      label: 'Simulated marketplace volume',
      value: '₦0',
      helper: 'Demo orders only — marketplace arrives in Milestone 5',
      impactLabel: 'simulated',
    },
  ]
}

export function recentActivityFromDeliveries(
  deliveries: Delivery[],
  limit = 6,
): ActivityEvent[] {
  const events: ActivityEvent[] = []

  for (const delivery of deliveries) {
    for (const entry of delivery.history) {
      events.push({
        id: entry.id,
        title: statusTitle(entry.toStatus),
        detail: `${delivery.reference}: ${entry.note}`,
        timestamp: entry.timestamp,
        actor: `${entry.actorName} · ${entry.actorRole.replace('_', ' ')}`,
      })
    }
  }

  return events
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    )
    .slice(0, limit)
}

function statusTitle(status: Delivery['status']): string {
  switch (status) {
    case 'pending_plant_confirmation':
      return 'Delivery submitted'
    case 'confirmed':
      return 'Plant weight confirmed'
    case 'disputed':
      return 'Delivery disputed'
    case 'awaiting_review':
      return 'Sent for independent review'
    case 'corrections_requested':
      return 'Correction requested'
    case 'reviewed':
      return 'Review recorded'
    case 'rejected':
      return 'Delivery rejected'
  }
}
