import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  MessageSquare,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  FlaskConical,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { DeliveryStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useDelivery } from '@/store/useDeliveries'
import { recordReview } from '@/store/deliveries'
import { useDemoSession, getDemoUserByRole } from '@/lib/demo-session'
import { formatDate, formatDateTime, deliveryStatusLabel } from '@/lib/labels'
import { formatFileSize, evidenceKindLabel } from '@/lib/evidence'
import { calculateIllustrativeMrv, NCV_GJ_PER_T } from '@/lib/mrv'
import type { EvidenceFile, ReviewDecision, ReviewDecisionType } from '@/types'

// ── Schema ────────────────────────────────────────────────────────────────────

const schema = z.object({
  decision: z.enum(['approved', 'corrections_requested', 'rejected']),
  note: z
    .string()
    .min(10, 'Please write at least 10 characters explaining your decision.'),
})

type FormValues = z.infer<typeof schema>

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-destructive">{msg}</p>
}

// ── Evidence item ─────────────────────────────────────────────────────────────

function EvidenceItem({ file }: { file: EvidenceFile }) {
  const isImage = file.mimeType.startsWith('image/')
  const Icon = isImage ? ImageIcon : FileText
  return (
    <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 px-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
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
          {formatDateTime(file.uploadedAt)} · {file.uploadedBy}
        </p>
        {file.note && (
          <p className="mt-0.5 text-xs italic text-muted-foreground">{file.note}</p>
        )}
      </div>
    </div>
  )
}

// ── Past review card ──────────────────────────────────────────────────────────

function PastReviewCard({ review }: { review: ReviewDecision }) {
  const colorClass =
    review.decision === 'approved'
      ? 'border-[color:var(--status-success)] bg-[color:var(--status-success-subtle)]'
      : review.decision === 'rejected'
        ? 'border-[color:var(--status-error)] bg-[color:var(--status-error-subtle)]'
        : 'border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)]'
  const label =
    review.decision === 'approved'
      ? 'Approved'
      : review.decision === 'rejected'
        ? 'Rejected'
        : 'Corrections requested'

  return (
    <div className={`rounded-md border px-3 py-2.5 ${colorClass}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(review.timestamp)}</p>
      </div>
      <p className="mt-1 text-sm text-foreground">{review.note}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {review.reviewerName} · {review.reviewerRole}
      </p>
    </div>
  )
}

// ── MRV section ───────────────────────────────────────────────────────────────

function MrvSection({ delivery }: { delivery: ReturnType<typeof useDelivery> }) {
  const [expanded, setExpanded] = useState(false)

  const result = useMemo(() => {
    if (!delivery || delivery.measuredQuantityT === null) return null
    return calculateIllustrativeMrv({
      deliveryReference: delivery.reference,
      biomassType: delivery.biomassType,
      measuredWeightT: delivery.measuredQuantityT,
      baselineFuel: 'coal', // Default: coal displaced — most common in Nigerian cement
    })
  }, [delivery])

  if (!delivery) return null

  if (delivery.measuredQuantityT === null) {
    return (
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <FlaskConical className="size-4" aria-hidden />
            Illustrative climate estimate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No plant-confirmed measured weight yet. The calculation requires a confirmed
            weight — the supplier's declared weight is not used.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!result) return null

  const ncvEntry = NCV_GJ_PER_T[delivery.biomassType]
  const statusColor =
    result.status === 'complete'
      ? 'border-[color:var(--status-success)] bg-[color:var(--status-success-subtle)] text-[color:var(--status-success)]'
      : result.status === 'illustrative'
        ? 'border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)] text-[color:var(--status-warning)]'
        : 'border-[color:var(--status-error)] bg-[color:var(--status-error-subtle)] text-[color:var(--status-error)]'

  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <FlaskConical className="size-4" aria-hidden />
            Illustrative climate estimate
          </CardTitle>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            aria-expanded={expanded}
          >
            {expanded ? (
              <>
                Hide detail <ChevronUp className="size-3.5" />
              </>
            ) : (
              <>
                Show detail <ChevronDown className="size-3.5" />
              </>
            )}
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status badge */}
        <div className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium ${statusColor}`}>
          {result.status === 'illustrative'
            ? 'Illustrative — defaults applied'
            : result.status === 'complete'
              ? 'All inputs provided'
              : 'Incomplete — see warnings'}
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Gross avoided</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {result.grossAvoidedEmissionsTco2e.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">tCO₂e</span>
            </p>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Transport leakage</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">
              {result.transportLeakageTco2e > 0
                ? `−${result.transportLeakageTco2e.toFixed(2)}`
                : 'Not provided'}
              {result.transportLeakageTco2e > 0 && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">tCO₂e</span>
              )}
            </p>
          </div>
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">Net avoided (illustrative)</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-primary">
              {result.netAvoidedEmissionsTco2e.toFixed(2)}
              <span className="ml-1 text-xs font-normal text-muted-foreground">tCO₂e</span>
            </p>
          </div>
        </div>

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="space-y-1.5">
            {result.warnings.map((w, i) => (
              <div
                key={i}
                className="flex gap-2 rounded-md border border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)] px-3 py-2 text-xs text-[color:var(--status-warning)]"
              >
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <p>{w}</p>
              </div>
            ))}
          </div>
        )}

        {/* Expanded: inputs + step-by-step */}
        {expanded && (
          <div className="space-y-4">
            <Separator />

            {/* Resolved inputs */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Inputs used
              </p>
              <dl className="divide-y divide-border rounded-md border border-border bg-card text-sm">
                {[
                  ['Biomass type', result.resolvedInputs.biomassType],
                  ['Measured weight', `${result.resolvedInputs.measuredWeightT.toFixed(2)} t`],
                  [
                    'Moisture content',
                    result.resolvedInputs.moistureContentPct !== null
                      ? `${result.resolvedInputs.moistureContentPct}%`
                      : 'Not provided (treated as 0%)',
                  ],
                  ['Dry-matter weight', `${result.resolvedInputs.dryMatterWeightT.toFixed(3)} t`],
                  [
                    'Net calorific value',
                    `${result.resolvedInputs.ncvGjPerT} GJ/t — ${result.resolvedInputs.ncvSource}`,
                  ],
                  ['Baseline fuel', result.resolvedInputs.baselineFuel.replace('_', ' ')],
                  [
                    'Baseline emission factor',
                    `${result.resolvedInputs.baselineEfTco2ePerGj} tCO₂e/GJ — ${result.resolvedInputs.baselineEfSource}`,
                  ],
                  [
                    'Combustion efficiency',
                    `${(result.resolvedInputs.combustionEfficiency * 100).toFixed(0)}%`,
                  ],
                  [
                    'Transport distance',
                    result.resolvedInputs.transportDistanceKm !== null
                      ? `${result.resolvedInputs.transportDistanceKm} km (one-way)`
                      : 'Not provided',
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 px-3 py-1.5">
                    <dt className="shrink-0 text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 break-words text-right text-xs font-medium">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              {ncvEntry && (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  NCV note: {ncvEntry.note}
                </p>
              )}
            </div>

            {/* Calculation steps */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Calculation steps
              </p>
              <ol className="space-y-2">
                {result.steps.map((step, i) => (
                  <li
                    key={i}
                    className="rounded-md border border-border bg-card px-3 py-2.5 text-sm"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-medium text-foreground">{step.label}</p>
                      <p className="shrink-0 tabular-nums font-semibold text-foreground">
                        {step.value.toFixed(3)} {step.unit}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{step.source}</p>
                    {step.note && (
                      <p className="mt-0.5 text-xs italic text-muted-foreground">{step.note}</p>
                    )}
                  </li>
                ))}
              </ol>
            </div>

            {/* Methodology reference */}
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
              <p>
                <strong className="font-medium text-foreground">Methodology reference:</strong>{' '}
                {result.methodologyRef}
              </p>
              <p className="mt-1">
                Calculated at: {formatDateTime(result.calculatedAt)}
              </p>
              <p className="mt-1 text-destructive/80">
                This estimate is for demonstration only. It does not constitute a verified
                emission reduction or authorise the creation of carbon credits.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ReviewPage() {
  const { id } = useParams<{ id: string }>()
  const delivery = useDelivery(id ?? '')
  const navigate = useNavigate()

  const { role: activeRole, setRole } = useDemoSession()
  const demoReviewer = getDemoUserByRole('reviewer')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      decision: 'approved',
      note: '',
    },
  })

  const decision = watch('decision')

  if (activeRole !== 'reviewer') {
    return (
      <>
        <Header title="Evidence review" subtitle="Switch the demo role to reviewer to continue" />

        <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
          <Card className="w-full max-w-md shadow-none">
            <CardHeader>
              <CardTitle>Role required: reviewer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Independent review actions are restricted to the reviewer role in the demo model.
              </p>
              <Button type="button" onClick={() => setRole('reviewer')}>
                Switch to reviewer role
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    )
  }

  // ── Guards ────────────────────────────────────────────────────────────────

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
                No delivery with ID <code className="font-mono text-xs">{id}</code> exists in this
                session.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/review">
                  <ArrowLeft className="mr-1.5 size-3.5" />
                  Back to queue
                </Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    )
  }

  const canReview =
    delivery.status === 'awaiting_review' || delivery.status === 'corrections_requested'

  // ── Submit ────────────────────────────────────────────────────────────────

  function onSubmit(values: FormValues) {
    setGlobalError('')
    setIsSubmitting(true)
    try {
      recordReview(
        delivery!.id,
        demoReviewer.name,
        demoReviewer.role,
        values.decision as ReviewDecisionType,
        values.note,
      )
      navigate('/review')
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      )
      setIsSubmitting(false)
    }
  }

  // ── Variance helper ───────────────────────────────────────────────────────

  const variance =
    delivery.measuredQuantityT !== null
      ? delivery.measuredQuantityT - delivery.declaredQuantityT
      : null
  const variancePct =
    variance !== null && delivery.declaredQuantityT > 0
      ? (variance / delivery.declaredQuantityT) * 100
      : null

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Header title={delivery.reference} subtitle="Evidence review" />

      <main className="flex-1 space-y-5 px-4 py-6 sm:px-6">
        {/* Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/review">
              <ArrowLeft className="mr-1.5 size-3.5" />
              Review queue
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/deliveries/${delivery.id}`}>View full delivery →</Link>
          </Button>
        </div>

        {/* Status row */}
        <div className="flex flex-wrap items-center gap-3">
          <DeliveryStatusBadge status={delivery.status} />
          {variance !== null && Math.abs(variance) > 0.05 && (
            <div
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
                Math.abs(variancePct ?? 0) > 3
                  ? 'border-[color:var(--status-error)] bg-[color:var(--status-error-subtle)] text-[color:var(--status-error)]'
                  : 'border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)] text-[color:var(--status-warning)]'
              }`}
            >
              <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
              {variance > 0 ? '+' : ''}
              {variance.toFixed(2)} t ({variancePct !== null ? `${variancePct.toFixed(1)}%` : ''})
            </div>
          )}
          {!canReview && (
            <p className="text-sm text-muted-foreground">
              This delivery is{' '}
              <strong className="font-medium">{deliveryStatusLabel(delivery.status)}</strong> and
              cannot be reviewed again.
            </p>
          )}
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {/* Left: delivery facts + evidence + MRV */}
          <div className="space-y-5 lg:col-span-2">
            {/* Key facts */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Delivery facts</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border text-sm">
                  {[
                    ['Reference', delivery.reference],
                    ['Supplier', delivery.supplierName],
                    ['Plant', delivery.plantName],
                    ['Material', delivery.biomassType],
                    ['Origin', delivery.originLocation],
                    ['Date', formatDate(delivery.deliveryDate)],
                    ['Vehicle ref.', delivery.vehicleReference || '—'],
                    [
                      'Declared weight',
                      `${delivery.declaredQuantityT.toFixed(1)} t`,
                    ],
                    [
                      'Measured weight',
                      delivery.measuredQuantityT !== null
                        ? `${delivery.measuredQuantityT.toFixed(1)} t`
                        : 'Not confirmed',
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-baseline gap-3 py-1.5"
                    >
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="break-words text-right font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                {delivery.discrepancyNote && (
                  <div className="mt-3 rounded-md border border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)] px-3 py-2 text-xs text-[color:var(--status-warning)]">
                    <strong>Discrepancy note:</strong> {delivery.discrepancyNote}
                  </div>
                )}
                {delivery.notes && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    <strong className="font-medium text-foreground">Notes:</strong>{' '}
                    {delivery.notes}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Evidence */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">
                  Evidence ({delivery.evidence.length} file
                  {delivery.evidence.length !== 1 ? 's' : ''})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {delivery.evidence.length === 0 ? (
                  <div className="rounded-md border border-[color:var(--status-error)] bg-[color:var(--status-error-subtle)] px-3 py-2.5 text-sm text-[color:var(--status-error)]">
                    <strong>No evidence attached.</strong> This delivery cannot be approved
                    without supporting documents.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {delivery.evidence.map((f) => (
                      <EvidenceItem key={f.id} file={f} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Illustrative MRV */}
            <MrvSection delivery={delivery} />
          </div>

          {/* Right: decision form + history */}
          <div className="space-y-5">
            {/* Decision form */}
            {canReview ? (
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm">Record decision</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                    {/* Decision picker */}
                    <div
                      className="grid grid-cols-1 gap-2"
                      role="radiogroup"
                      aria-label="Review decision"
                    >
                      {(
                        [
                          {
                            value: 'approved',
                            label: 'Approve',
                            icon: CheckCircle2,
                            active: 'border-[color:var(--status-success)] bg-[color:var(--status-success-subtle)] text-[color:var(--status-success)]',
                            inactive: 'border-border text-muted-foreground',
                          },
                          {
                            value: 'corrections_requested',
                            label: 'Request corrections',
                            icon: MessageSquare,
                            active: 'border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)] text-[color:var(--status-warning)]',
                            inactive: 'border-border text-muted-foreground',
                          },
                          {
                            value: 'rejected',
                            label: 'Reject',
                            icon: XCircle,
                            active: 'border-[color:var(--status-error)] bg-[color:var(--status-error-subtle)] text-[color:var(--status-error)]',
                            inactive: 'border-border text-muted-foreground',
                          },
                        ] as const
                      ).map(({ value, label, icon: Icon, active, inactive }) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={decision === value}
                          onClick={() =>
                            setValue('decision', value, { shouldValidate: true })
                          }
                          className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            decision === value ? active : inactive
                          }`}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Note */}
                    <div className="space-y-1.5">
                      <Label htmlFor="review-note">
                        Decision note{' '}
                        <span className="text-muted-foreground text-xs">(required)</span>
                      </Label>
                      <Textarea
                        id="review-note"
                        rows={4}
                        placeholder={
                          decision === 'approved'
                            ? 'Confirm which documents were checked and whether weights match…'
                            : decision === 'corrections_requested'
                              ? 'Describe exactly what is missing or needs correction…'
                              : 'Explain the reason for rejection…'
                        }
                        aria-invalid={!!errors.note}
                        {...register('note')}
                      />
                      <ErrorMsg msg={errors.note?.message} />
                    </div>

                    {/* Approval warning */}
                    {decision === 'approved' && delivery.evidence.length === 0 && (
                      <div className="flex gap-2 rounded-md border border-[color:var(--status-error)] bg-[color:var(--status-error-subtle)] px-3 py-2 text-xs text-[color:var(--status-error)]">
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                        No evidence is attached. Approving without evidence is not recommended.
                      </div>
                    )}

                    {/* Approval disclaimer */}
                    {decision === 'approved' && (
                      <p className="text-xs text-muted-foreground">
                        Approving this delivery records a completed evidence review. It does
                        not constitute formal verification or authorise the creation of carbon
                        credits.
                      </p>
                    )}

                    {globalError && (
                      <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        {globalError}
                      </p>
                    )}

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      variant={decision === 'rejected' ? 'destructive' : 'default'}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          Saving…
                        </>
                      ) : decision === 'approved' ? (
                        'Record approval'
                      ) : decision === 'corrections_requested' ? (
                        'Send back for corrections'
                      ) : (
                        'Record rejection'
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm">Decision recorded</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This delivery has status{' '}
                    <strong className="font-medium text-foreground">
                      {deliveryStatusLabel(delivery.status)}
                    </strong>
                    . No further review action is available.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Review history */}
            {delivery.reviews.length > 0 && (
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm">
                    Review history ({delivery.reviews.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[...delivery.reviews].reverse().map((r) => (
                    <PastReviewCard key={r.id} review={r} />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Status history */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Status history</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {[...delivery.history].reverse().map((entry, idx) => (
                    <li key={entry.id} className="relative flex gap-3">
                      <div className="flex flex-col items-center">
                        <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />
                        {idx < delivery.history.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="min-w-0 pb-3">
                        <p className="text-sm font-medium text-foreground">
                          {deliveryStatusLabel(entry.toStatus)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{entry.note}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDateTime(entry.timestamp)} · {entry.actorName}
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
