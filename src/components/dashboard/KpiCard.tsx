import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ImpactLabelBadge } from '@/components/shared/StatusBadge'
import type { KpiMetric } from '@/types'

export function KpiCard({ metric }: { metric: KpiMetric }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metric.label}
        </CardTitle>
        <ImpactLabelBadge label={metric.impactLabel} />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight text-foreground">
          {metric.value}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p>
        {metric.trend ? (
          <p className="mt-2 text-xs font-medium text-primary">{metric.trend}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
