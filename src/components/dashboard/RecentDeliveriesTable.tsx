import { Link } from 'react-router-dom'
import { DeliveryStatusBadge } from '@/components/shared/StatusBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/labels'
import type { SampleDelivery } from '@/types'

export function RecentDeliveriesTable({
  deliveries,
}: {
  deliveries: SampleDelivery[]
}) {
  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Recent deliveries">
        {deliveries.map((delivery) => (
          <li key={delivery.id}>
            <Link
              to={`/deliveries/${delivery.id}`}
              className="block rounded-lg border border-border bg-card p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`View delivery ${delivery.reference}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{delivery.reference}</p>
                  <p className="truncate text-sm text-muted-foreground">{delivery.supplier}</p>
                </div>
                <DeliveryStatusBadge status={delivery.status} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Declared weight</dt>
                  <dd className="font-medium tabular-nums">{delivery.declaredQuantityT.toFixed(1)} t</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Measured weight</dt>
                  <dd className="font-medium tabular-nums">
                    {delivery.measuredQuantityT !== null
                      ? `${delivery.measuredQuantityT.toFixed(1)} t`
                      : 'Not yet weighed'}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted-foreground">Plant</dt>
                  <dd className="truncate font-medium">{delivery.plant}</dd>
                </div>
              </dl>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Supplier</TableHead>
            <TableHead>Plant</TableHead>
            <TableHead>Biomass</TableHead>
            <TableHead className="text-right">Declared (t)</TableHead>
            <TableHead className="text-right">Measured (t)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveries.map((delivery) => (
            <TableRow key={delivery.id}>
              <TableCell className="font-medium">
                <Link
                  to={`/deliveries/${delivery.id}`}
                  className="transition-colors hover:text-primary hover:underline"
                >
                  {delivery.reference}
                </Link>
              </TableCell>
              <TableCell>{delivery.supplier}</TableCell>
              <TableCell className="max-w-[180px] truncate">
                {delivery.plant}
              </TableCell>
              <TableCell>{delivery.biomassType}</TableCell>
              <TableCell className="text-right tabular-nums">
                {delivery.declaredQuantityT.toFixed(1)}
              </TableCell>
              <TableCell className="text-right tabular-nums text-muted-foreground">
                {delivery.measuredQuantityT !== null
                  ? delivery.measuredQuantityT.toFixed(1)
                  : '—'}
              </TableCell>
              <TableCell>
                <DeliveryStatusBadge status={delivery.status} />
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatDate(delivery.deliveryDate)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </>
  )
}
