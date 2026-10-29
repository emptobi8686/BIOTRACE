import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, SlidersHorizontal, ArrowRight } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { DeliveryStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import type { DeliveryStatus } from '@/types'

const ALL = 'all'

const STATUS_OPTIONS: { value: DeliveryStatus | typeof ALL; label: string }[] = [
  { value: ALL, label: 'All statuses' },
  { value: 'pending_plant_confirmation', label: 'Waiting for plant' },
  { value: 'confirmed', label: 'Confirmed by plant' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'awaiting_review', label: 'Awaiting review' },
  { value: 'corrections_requested', label: 'Corrections requested' },
  { value: 'reviewed', label: 'Evidence reviewed' },
  { value: 'rejected', label: 'Rejected' },
]

export function DeliveriesPage() {
  const deliveries = useDeliveries()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | typeof ALL>(ALL)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deliveries.filter((d) => {
      const matchStatus = statusFilter === ALL || d.status === statusFilter
      const matchSearch =
        !q ||
        d.reference.toLowerCase().includes(q) ||
        d.supplierName.toLowerCase().includes(q) ||
        d.plantName.toLowerCase().includes(q) ||
        d.biomassType.toLowerCase().includes(q) ||
        d.originLocation.toLowerCase().includes(q)
      return matchStatus && matchSearch
    })
  }, [deliveries, search, statusFilter])

  return (
    <>
      <Header
        title="Deliveries"
        subtitle="Biomass deliveries and plant confirmations"
      />

      <main className="flex-1 space-y-4 px-4 py-6 sm:px-6">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search + filter — full width on mobile, inline on sm+ */}
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1 sm:max-w-56">
              <Search
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                className="h-11 pl-9 sm:h-9"
                placeholder="Search deliveries…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search deliveries"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as DeliveryStatus | typeof ALL)}
            >
              <SelectTrigger
                className="h-11 sm:h-9 sm:w-52"
                aria-label="Filter by status"
              >
                <SlidersHorizontal
                  className="mr-2 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Add delivery — full width on mobile */}
          <Button asChild className="h-11 w-full sm:h-9 sm:w-auto">
            <Link to="/deliveries/new">
              <Plus className="mr-2 size-4" aria-hidden />
              Add a delivery
            </Link>
          </Button>
        </div>

        {/* Summary row */}
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{filtered.length}</span>{' '}
            {filtered.length === 1 ? 'delivery' : 'deliveries'}
            {statusFilter !== ALL || search ? ' matching filter' : ' total'}
          </span>
          <span>
            Declared weight:{' '}
            <span className="font-medium text-foreground">
              {filtered.reduce((s, d) => s + d.declaredQuantityT, 0).toFixed(1)} t
            </span>
          </span>
          <span>
            Measured weight:{' '}
            <span className="font-medium text-foreground">
              {filtered.reduce((s, d) => s + (d.measuredQuantityT ?? 0), 0).toFixed(1)} t
            </span>
          </span>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card py-16 text-center">
            <p className="text-sm font-medium text-foreground">No deliveries found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {search || statusFilter !== ALL
                ? 'Try clearing the search or filter.'
                : 'Add the first delivery to get started.'}
            </p>
          </div>
        ) : (
          <>
            {/* ── Mobile card list (hidden on md+) ───────────────────────── */}
            <ul className="space-y-3 md:hidden" aria-label="Delivery list">
              {filtered.map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/deliveries/${d.id}`}
                    className="block rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`View delivery ${d.reference}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{d.reference}</p>
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
                        <span className="text-muted-foreground">Material</span>
                        <p className="truncate font-medium text-foreground">{d.biomassType}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date</span>
                        <p className="font-medium text-foreground">{formatDate(d.deliveryDate)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Declared weight</span>
                        <p className="font-medium text-foreground tabular-nums">
                          {d.declaredQuantityT.toFixed(1)} t
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Measured weight</span>
                        <p className="font-medium text-foreground tabular-nums">
                          {d.measuredQuantityT !== null
                            ? `${d.measuredQuantityT.toFixed(1)} t`
                            : 'Not yet weighed'}
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

            {/* ── Desktop table (hidden below md) ────────────────────────── */}
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
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.reference}</TableCell>
                      <TableCell className="max-w-[140px] truncate">{d.supplierName}</TableCell>
                      <TableCell className="max-w-[160px] truncate">{d.plantName}</TableCell>
                      <TableCell className="max-w-[140px] truncate">{d.biomassType}</TableCell>
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
                        <Button asChild variant="ghost" size="sm" className="h-8 px-3 text-xs">
                          <Link to={`/deliveries/${d.id}`}>View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </main>
    </>
  )
}
