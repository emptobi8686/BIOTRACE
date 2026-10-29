import { useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { DeliveryStatusBadge } from '@/components/shared/StatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useDelivery } from '@/store/useDeliveries'
import { updateDeliveryStatus, addEvidenceToDelivery } from '@/store/deliveries'
import { fileToEvidence, formatFileSize, evidenceKindLabel } from '@/lib/evidence'
import { getDemoUserByRole, useDemoSession } from '@/lib/demo-session'
import { formatDate } from '@/lib/labels'
import type { EvidenceFile } from '@/types'

// ── Schema ───────────────────────────────────────────────────────────────────

const schema = z
  .object({
    measuredQuantityT: z
      .number({ invalid_type_error: 'Enter the measured weight' })
      .positive('Weight must be greater than 0')
      .max(10000, 'Exceeds maximum — check the value'),
    decision: z.enum(['confirm', 'dispute']),
    discrepancyNote: z.string().optional(),
    sendToReview: z.boolean().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.decision === 'dispute' && !val.discrepancyNote?.trim()) {
      ctx.addIssue({
        path: ['discrepancyNote'],
        code: z.ZodIssueCode.custom,
        message: 'Explain the discrepancy when disputing a delivery.',
      })
    }
  })

type FormValues = z.infer<typeof schema>

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-destructive">{msg}</p>
}

// ── Component ────────────────────────────────────────────────────────────────

export function PlantConfirmationPage() {
  const { id } = useParams<{ id: string }>()
  const delivery = useDelivery(id ?? '')
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [weighingTickets, setWeighingTickets] = useState<EvidenceFile[]>([])
  const [fileError, setFileError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const { role: activeRole, setRole } = useDemoSession()
  const demoPlantUser = getDemoUserByRole('plant_operator')

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      measuredQuantityT: undefined,
      decision: 'confirm',
      discrepancyNote: '',
      sendToReview: true,
    },
  })

  const decision = watch('decision')

  if (activeRole !== 'plant_operator') {
    return (
      <>
        <Header
          title="Record plant weight"
          subtitle="Switch the demo role to plant operator to confirm or dispute"
        />

        <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
          <Card className="w-full max-w-md shadow-none">
            <CardHeader>
              <CardTitle>Role required: plant operator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                The plant confirmation step is an operational action limited to the plant operator
                role in this demo workflow.
              </p>
              <Button type="button" onClick={() => setRole('plant_operator')}>
                Switch to plant operator role
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    )
  }

  // ── Guards ───────────────────────────────────────────────────────────────

  if (!delivery) {
    return (
      <>
        <Header title="Delivery not found" />
        <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
          <Card className="w-full max-w-md shadow-none">
            <CardHeader><CardTitle>Delivery not found</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">No delivery with ID <code>{id}</code>.</p>
              <Button asChild variant="outline" size="sm"><Link to="/deliveries"><ArrowLeft className="mr-1.5 size-3.5" />Back</Link></Button>
            </CardContent>
          </Card>
        </main>
      </>
    )
  }

  if (delivery.status !== 'pending_plant_confirmation') {
    return (
      <>
        <Header title="Cannot confirm" subtitle={delivery.reference} />
        <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
          <Card className="w-full max-w-md shadow-none">
            <CardHeader><CardTitle>Action not available</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This delivery is currently <strong>{delivery.status.replaceAll('_', ' ')}</strong> and
                cannot be confirmed or disputed at this stage.
              </p>
              <DeliveryStatusBadge status={delivery.status} />
              <Button asChild variant="outline" size="sm">
                <Link to={`/deliveries/${id}`}><ArrowLeft className="mr-1.5 size-3.5" />View delivery</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    )
  }

  const activeDelivery = delivery

  // ── File upload ──────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFileError('')
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const results: EvidenceFile[] = []
    for (const file of files) {
      try {
        const ev = await fileToEvidence(file, 'weighing_ticket', demoPlantUser.name)
        results.push(ev)
      } catch (err) {
        setFileError(err instanceof Error ? err.message : 'File error')
        break
      }
    }
    setWeighingTickets((prev) => [...prev, ...results])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeTicket(fileId: string) {
    setWeighingTickets((prev) => {
      const removed = prev.find((f) => f.id === fileId)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((f) => f.id !== fileId)
    })
  }

  // ── Submit ───────────────────────────────────────────────────────────────

  function onSubmit(values: FormValues) {
    setGlobalError('')

    if (!activeDelivery) {
      setGlobalError('Delivery is no longer available. Please reload and try again.')
      setIsSubmitting(false)
      return
    }

    setIsSubmitting(true)
    try {
      const toStatus = values.decision === 'confirm'
        ? (values.sendToReview ? 'awaiting_review' : 'confirmed')
        : 'disputed'

      const note = values.decision === 'confirm'
        ? `Measured ${values.measuredQuantityT} t (declared ${activeDelivery.declaredQuantityT} t).${
            values.sendToReview ? ' Forwarded for independent review.' : ''
          }`
        : `Disputed. Measured ${values.measuredQuantityT} t (declared ${activeDelivery.declaredQuantityT} t). ${values.discrepancyNote ?? ''}`

      if (weighingTickets.length > 0) {
        addEvidenceToDelivery(activeDelivery.id, weighingTickets)
      }

      updateDeliveryStatus(
        activeDelivery.id,
        toStatus,
        demoPlantUser.name,
        'plant_operator',
        note,
        {
          measuredQuantityT: values.measuredQuantityT,
          discrepancyNote: values.discrepancyNote ?? '',
        },
      )

      navigate(`/deliveries/${activeDelivery.id}`)
    } catch (err) {
      setGlobalError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setIsSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Header
        title="Record plant weight"
        subtitle={delivery.reference}
      />

      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-xl space-y-5">
          <Button asChild variant="outline" size="sm">
            <Link to={`/deliveries/${delivery.id}`}>
              <ArrowLeft className="mr-1.5 size-3.5" />
              Back to delivery
            </Link>
          </Button>

          {/* Delivery summary */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-sm">Delivery summary</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="font-medium">{delivery.reference}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Supplier</dt>
                  <dd>{delivery.supplierName}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Biomass type</dt>
                  <dd>{delivery.biomassType}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Delivery date</dt>
                  <dd>{formatDate(delivery.deliveryDate)}</dd>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground font-medium">Declared weight</dt>
                  <dd className="text-lg font-semibold">{delivery.declaredQuantityT.toFixed(1)} t</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Measured weight */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Weight measured at the plant</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="measuredQuantityT">Measured weight (tonnes) *</Label>
                  <Input
                    id="measuredQuantityT"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="e.g. 41.8"
                    aria-invalid={!!errors.measuredQuantityT}
                    {...register('measuredQuantityT', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the weight shown by the plant scale (weighbridge). It replaces
                    the declared weight in operational totals.
                  </p>
                  <ErrorMsg msg={errors.measuredQuantityT?.message} />
                </div>

                {/* Weighing ticket upload */}
                <div className="space-y-2">
                  <Label>Weighing ticket</Label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-11 w-full sm:w-auto"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-1.5 size-3.5" />
                      Attach weighing ticket
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/jpeg,image/png,image/webp"
                      multiple
                      className="sr-only"
                      onChange={handleFileChange}
                      aria-label="Upload weighing ticket"
                    />
                    <span className="text-xs text-muted-foreground">PDF, JPG or PNG</span>
                  </div>
                  {fileError && <p className="text-xs text-destructive">{fileError}</p>}
                  {weighingTickets.length > 0 && (
                    <ul className="space-y-1.5">
                      {weighingTickets.map((f) => {
                        const Icon = f.mimeType.startsWith('image/') ? ImageIcon : FileText
                        return (
                          <li
                            key={f.id}
                            className="flex items-center gap-3 rounded-md border border-border bg-muted/40 px-3 py-2"
                          >
                            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{f.fileName}</p>
                              <p className="text-xs text-muted-foreground">
                                {evidenceKindLabel(f.kind)} · {formatFileSize(f.sizeBytes)}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeTicket(f.id)}
                              className="flex size-11 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              aria-label={`Remove ${f.fileName}`}
                            >
                              <X className="size-3.5" />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Decision */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Decision</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Confirmation decision">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={decision === 'confirm'}
                    onClick={() => setValue('decision', 'confirm', { shouldValidate: true })}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      decision === 'confirm'
                        ? 'border-primary bg-primary/5 font-medium text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                    Confirm delivery
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={decision === 'dispute'}
                    onClick={() => setValue('decision', 'dispute', { shouldValidate: true })}
                    className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      decision === 'dispute'
                        ? 'border-destructive bg-destructive/5 font-medium text-destructive'
                        : 'border-border text-muted-foreground hover:border-destructive/40'
                    }`}
                  >
                    <XCircle className="size-4 shrink-0" aria-hidden />
                    Dispute delivery
                  </button>
                </div>

                {/* Send to review checkbox (confirm path) */}
                {decision === 'confirm' && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-muted/30 px-3 py-2.5">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 accent-primary"
                      {...register('sendToReview')}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Forward to independent review
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Recommended. The reviewer will check the evidence package before
                        any emissions estimate is calculated.
                      </p>
                    </div>
                  </label>
                )}

                {/* Discrepancy note (dispute path) */}
                {decision === 'dispute' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="discrepancyNote">
                      Discrepancy explanation *
                    </Label>
                    <div className="flex gap-2 rounded-md border border-amber-300/80 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <p>
                        Disputing a delivery flags it for investigation. Provide a clear
                        explanation so the supplier can respond.
                      </p>
                    </div>
                    <Textarea
                      id="discrepancyNote"
                      placeholder="Describe the discrepancy or reason for dispute…"
                      rows={3}
                      aria-invalid={!!errors.discrepancyNote}
                      {...register('discrepancyNote')}
                    />
                    <ErrorMsg msg={errors.discrepancyNote?.message} />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Global error */}
            {globalError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {globalError}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button asChild variant="outline" type="button" className="w-full sm:w-auto">
                <Link to={`/deliveries/${delivery.id}`}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                variant={decision === 'dispute' ? 'destructive' : 'default'}
                className="w-full sm:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Saving…
                  </>
                ) : decision === 'dispute' ? (
                  'Record dispute'
                ) : (
                  'Confirm weight'
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </>
  )
}
