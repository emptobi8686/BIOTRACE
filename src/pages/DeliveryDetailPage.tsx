import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Truck,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { DeliveryStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useDelivery } from '@/store/useDeliveries'
import { formatDate, formatDateTime, deliveryStatusLabel } from '@/lib/labels'
import { evidenceKindLabel, formatFileSize } from '@/lib/evidence'
import type { EvidenceFile } from '@/types'

function EvidenceItem({ file }: { file: EvidenceFile }) {
  const isImage = file.mimeType.startsWith('image/')
  const Icon = isImage ? ImageIcon : FileText
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-md border border-border bg-muted/40 px-3 py-3 sm:flex-row sm:items-start">
      {isImage && file.previewUrl ? (
        <a href={file.previewUrl} target="_blank" rel="noreferrer" className="shrink-0">
          <img
            src={file.previewUrl}
            alt={`Preview of ${file.fileName}`}
            className="h-24 w-full rounded border border-border object-cover sm:size-16"
          />
        </a>
      ) : (
        <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        {file.previewUrl ? (
          <a
            href={file.previewUrl}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {file.fileName}
          </a>
        ) : (
          <p className="truncate text-sm font-medium text-foreground">{file.fileName}</p>
        )}
        <p className="text-xs text-muted-foreground">
          {evidenceKindLabel(file.kind)} · {formatFileSize(file.sizeBytes)} ·{' '}
          {formatDateTime(file.uploadedAt)}
        </p>
        {file.note && (
          <p className="mt-0.5 text-xs italic text-muted-foreground">{file.note}</p>
        )}
      </div>
      <span className="break-words text-xs text-muted-foreground sm:max-w-32 sm:text-right">
        {file.uploadedBy}
      </span>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="grid min-h-[32px] grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-baseline gap-3 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-foreground">
        {value !== null && value !== '' ? String(value) : <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  )
}

export function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>()
  const delivery = useDelivery(id ?? '')

  if (!delivery) {
    return (
      <>
        <Header title="Delivery not found" />
        <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
          <Card className="w-full max-w-md shadow-none">
            <CardHeader>
              <CardTitle>Delivery not found</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No delivery with ID <code className="font-mono">{id}</code> exists in this session.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/deliveries">
                  <ArrowLeft className="mr-1.5 size-3.5" />
                  Back to deliveries
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    )
  }

  const discrepancy =
    delivery.measuredQuantityT !== null
      ? delivery.measuredQuantityT - delivery.declaredQuantityT
      : null

  const canConfirmPlant =
    delivery.status === 'pending_plant_confirmation'

  const canReview =
    delivery.status === 'awaiting_review' || delivery.status === 'corrections_requested'

  return (
    <>
      <Header
        title={delivery.reference}
        subtitle={`${delivery.supplierName} → ${delivery.plantName}`}
      />

      <main className="flex-1 space-y-5 px-4 py-6 sm:px-6">
        {/* Back + actions bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/deliveries">
              <ArrowLeft className="mr-1.5 size-3.5" />
              All deliveries
            </Link>
          </Button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {canConfirmPlant && (
              <Button asChild size="sm">
                <Link to={`/deliveries/${delivery.id}/confirm`}>
                  <Truck className="mr-1.5 size-3.5" />
                  Record plant weight
                </Link>
              </Button>
            )}
            {canReview && (
              <Button asChild size="sm" variant="outline">
                <Link to={`/review/${delivery.id}`}>
                  Review evidence
                  <ChevronRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Status + discrepancy alert */}
        <div className="flex flex-wrap items-center gap-3">
          <DeliveryStatusBadge status={delivery.status} />
          {discrepancy !== null && Math.abs(discrepancy) > 0.05 && (
            <div className="flex items-center gap-1.5 rounded-md border border-amber-300/80 bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
              {discrepancy > 0 ? '+' : ''}
              {discrepancy.toFixed(2)} t vs declared
            </div>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left column: delivery fields */}
          <div className="space-y-5 lg:col-span-2">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Delivery details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border">
                  <FieldRow label="Reference" value={delivery.reference} />
                  <FieldRow label="Supplier" value={delivery.supplierName} />
                  <FieldRow label="Destination plant" value={delivery.plantName} />
                  <FieldRow label="Biomass type" value={delivery.biomassType} />
                  <FieldRow label="Origin location" value={delivery.originLocation} />
                  <FieldRow label="Delivery date" value={formatDate(delivery.deliveryDate)} />
                  <FieldRow label="Vehicle / transport ref." value={delivery.vehicleReference || null} />
                </dl>
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Quantities</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border">
                  <FieldRow label="Declared weight" value={`${delivery.declaredQuantityT.toFixed(1)} t`} />
                  <FieldRow
                    label="Measured weight"
                    value={
                      delivery.measuredQuantityT !== null
                        ? `${delivery.measuredQuantityT.toFixed(1)} t`
                        : null
                    }
                  />
                  {discrepancy !== null && (
                    <FieldRow
                      label="Variance"
                      value={`${discrepancy > 0 ? '+' : ''}${discrepancy.toFixed(2)} t`}
                    />
                  )}
                  {delivery.discrepancyNote && (
                    <div className="py-2">
                      <dt className="text-sm text-muted-foreground">Discrepancy note</dt>
                      <dd className="mt-0.5 text-sm text-foreground">{delivery.discrepancyNote}</dd>
                    </div>
                  )}
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  Declared weight is never treated as the final measured weight for emissions calculations.
                </p>
              </CardContent>
            </Card>

            {delivery.notes && (
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{delivery.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Evidence */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">
                  Photos and papers for this load ({delivery.evidence.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {delivery.evidence.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No evidence files attached.</p>
                ) : (
                  <div className="space-y-2">
                    {delivery.evidence.map((file) => (
                      <EvidenceItem key={file.id} file={file} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right column: status history */}
          <div>
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Status history</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {[...delivery.history].reverse().map((entry, idx) => (
                    <li key={entry.id} className="relative flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                        {idx < delivery.history.length - 1 ? (
                          <span className="mt-1 w-px flex-1 bg-border" />
                        ) : null}
                      </div>
                      <div className="min-w-0 pb-4">
                        <p className="text-sm font-medium text-foreground">
                          {deliveryStatusLabel(entry.toStatus)}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">{entry.note}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatDateTime(entry.timestamp)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.actorName} · {entry.actorRole}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}
