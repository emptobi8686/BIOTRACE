import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ClipboardCheck, Search } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { DeliveryStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useDeliveries } from '@/store/useDeliveries'
import { formatDate } from '@/lib/labels'

export function ReviewQueuePage() {
  const deliveries = useDeliveries()
  const [search, setSearch] = useState('')

  // Only deliveries that need a reviewer decision
  const queue = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deliveries
      .filter(
        (d) =>
          d.status === 'awaiting_review' || d.status === 'corrections_requested',
      )
      .filter(
        (d) =>
          !q ||
          d.reference.toLowerCase().includes(q) ||
          d.supplierName.toLowerCase().includes(q) ||
          d.plantName.toLowerCase().includes(q) ||
          d.biomassType.toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
      ) // oldest first — most urgent at top
  }, [deliveries, search])

  const correctionCount = deliveries.filter(
    (d) => d.status === 'corrections_requested',
  ).length
  const awaitingCount = deliveries.filter(
    (d) => d.status === 'awaiting_review',
  ).length

  return (
    <>
      <Header
        title="Review queue"
        subtitle="Independent review of biomass delivery evidence"
      />

      <main className="flex-1 space-y-5 px-4 py-6 sm:px-6">
        {/* Summary chips */}
        <div className="flex flex-wrap gap-2">
          <span className="status-badge status-badge--info">
            <span className="font-semibold">{awaitingCount}</span>
            <span>awaiting review</span>
          </span>
          {correctionCount > 0 && (
            <span className="status-badge status-badge--warning">
              <span className="font-semibold">{correctionCount}</span>
              <span>corrections requested</span>
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-72">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="h-11 pl-9 sm:h-9"
            placeholder="Search queue…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search review queue"
          />
        </div>

        {queue.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card py-16 text-center">
            <ClipboardCheck
              className="mx-auto mb-3 size-8 text-muted-foreground/50"
              aria-hidden
            />
            <p className="text-sm font-medium text-foreground">
              {search ? 'No matching deliveries' : 'Review queue is empty'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? 'Try clearing the search.'
                : 'Deliveries forwarded by the plant will appear here.'}
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <ul className="space-y-3 md:hidden" aria-label="Review queue">
              {queue.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/review/${d.id}`}
                    className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {d.reference}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {d.supplierName}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <DeliveryStatusBadge status={d.status} />
                        <ArrowRight className="size-4 text-muted-foreground" aria-hidden />
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <div>
                        <p className="text-muted-foreground">Material</p>
                        <p className="truncate font-medium text-foreground">
                          {d.biomassType}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date</p>
                        <p className="font-medium text-foreground">
                          {formatDate(d.deliveryDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Declared weight</p>
                        <p className="font-medium tabular-nums text-foreground">
                          {d.declaredQuantityT.toFixed(1)} t
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Measured weight</p>
                        <p className="font-medium tabular-nums text-foreground">
                          {d.measuredQuantityT !== null
                            ? `${d.measuredQuantityT.toFixed(1)} t`
                            : '—'}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 truncate text-xs text-muted-foreground">
                      {d.plantName}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto rounded-lg border border-border bg-card md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reference</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Plant</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Declared (t)</TableHead>
                    <TableHead className="text-right">Measured (t)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-28" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.reference}</TableCell>
                      <TableCell className="max-w-[140px] truncate">
                        {d.supplierName}
                      </TableCell>
                      <TableCell className="max-w-[160px] truncate">
                        {d.plantName}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate">
                        {d.biomassType}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {d.declaredQuantityT.toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {d.measuredQuantityT !== null
                          ? d.measuredQuantityT.toFixed(1)
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <DeliveryStatusBadge status={d.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(d.deliveryDate)}
                      </TableCell>
                      <TableCell>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs"
                        >
                          <Link to={`/review/${d.id}`}>Review</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Disclaimer */}
        <Card className="shadow-none">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">
              <strong className="font-medium text-foreground">Reviewer role:</strong>{' '}
              Check evidence packages, confirm quantities match weighbridge records,
              flag missing documents, and record a decision. Approving a delivery here
              does not constitute formal verification or credit issuance under any
              recognised carbon standard.
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
