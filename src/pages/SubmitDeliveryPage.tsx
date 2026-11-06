import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { addDelivery, syncDeliveriesFromSupabase } from '@/store/deliveries'
import { fileToEvidence, formatFileSize, evidenceKindLabel } from '@/lib/evidence'
import { getDemoUserByRole, useDemoSession } from '@/lib/demo-session'
import { suppliers, plants, BIOMASS_TYPES } from '@/data/catalog'
import { DATA_MODE } from '@/lib/data-access'
import { createDeliveryInSupabase, listApprovedPlants, listApprovedSuppliers } from '@/lib/deliveries-supabase'
import { useOrganizations } from '@/lib/organization-context'
import type { EvidenceFile, EvidenceKind, PlantOption, SupplierOption } from '@/types'

// ── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  supplierId: z.string().min(1, 'Select a supplier'),
  plantId: z.string().min(1, 'Select a destination plant'),
  biomassType: z.string().min(1, 'Select a biomass type'),
  originLocation: z.string().min(3, 'Enter the origin / collection location'),
  declaredQuantityT: z
    .number({ invalid_type_error: 'Enter a number' })
    .positive('Quantity must be greater than 0')
    .max(5000, 'Quantity exceeds 5 000 t — check the value'),
  deliveryDate: z.string().min(1, 'Enter the delivery date'),
  vehicleReference: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

// ── Helpers ──────────────────────────────────────────────────────────────────

const EVIDENCE_KINDS: EvidenceKind[] = [
  'delivery_note',
  'weighing_ticket',
  'photo',
  'transport_doc',
  'other',
]

function ErrorMsg({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-destructive">{msg}</p>
}

// ── Component ────────────────────────────────────────────────────────────────

export function SubmitDeliveryPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [pendingEvidence, setPendingEvidence] = useState<EvidenceFile[]>([])
  const [evidenceError, setEvidenceError] = useState('')
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>('delivery_note')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState('')

  const { activeOrganization } = useOrganizations()
  const isSupabase = DATA_MODE === 'supabase'
  const [availableSuppliers, setAvailableSuppliers] = useState<SupplierOption[]>(suppliers)
  const [availablePlants, setAvailablePlants] = useState<PlantOption[]>(plants)

  const { role: activeRole, setRole } = useDemoSession()
  const demoSupplierUser = getDemoUserByRole('supplier')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      supplierId: '',
      plantId: '',
      biomassType: '',
      originLocation: '',
      declaredQuantityT: undefined,
      deliveryDate: new Date().toISOString().slice(0, 10),
      vehicleReference: '',
      notes: '',
    },
  })

  useEffect(() => {
    if (!isSupabase) return
    let active = true

    void Promise.all([listApprovedSuppliers(), listApprovedPlants()]).then(
      ([supData, plantData]) => {
        if (!active) return
        if (supData.length > 0) setAvailableSuppliers(supData)
        if (plantData.length > 0) setAvailablePlants(plantData)
      },
    )

    if (
      activeOrganization &&
      ['supplier', 'biomass_aggregator'].includes(activeOrganization.organizationType)
    ) {
      setValue('supplierId', activeOrganization.id, { shouldValidate: true })
    }

    return () => {
      active = false
    }
  }, [isSupabase, activeOrganization, setValue])

  const watchedSupplierId = watch('supplierId')
  const watchedPlantId = watch('plantId')
  const watchedBiomassType = watch('biomassType')

  const isAuthorizedInSupabase =
    isSupabase &&
    activeOrganization &&
    ['supplier', 'biomass_aggregator'].includes(activeOrganization.organizationType)

  if (!isSupabase && activeRole !== 'supplier') {
    return (
      <>
        <Header
          title="Add a delivery"
          subtitle="Switch the demo role to supplier to submit a record"
        />

        <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
          <Card className="w-full max-w-md shadow-none">
            <CardHeader>
              <CardTitle>Role required: supplier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This operation is restricted to the supplier demo role in order to mirror the
                real workflow boundary.
              </p>
              <Button type="button" onClick={() => setRole('supplier')}>
                Switch to supplier role
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    )
  }

  if (isSupabase && !isAuthorizedInSupabase) {
    return (
      <>
        <Header
          title="Add a delivery"
          subtitle="Approved supplier membership required"
        />

        <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
          <Card className="w-full max-w-md shadow-none">
            <CardHeader>
              <CardTitle>Organization approval required</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Only approved biomass supplier or aggregator organizations may declare and
                dispatch biomass shipments to cement plants.
              </p>
              <Button asChild>
                <Link to="/onboarding">View organization status</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </>
    )
  }

  // ── Evidence upload handler ───────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEvidenceError('')
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const results: EvidenceFile[] = []
    for (const file of files) {
      try {
        const ev = await fileToEvidence(file, evidenceKind, demoSupplierUser.name)
        results.push(ev)
      } catch (err) {
        setEvidenceError(err instanceof Error ? err.message : 'File error')
        break
      }
    }
    setPendingEvidence((prev) => [...prev, ...results])
    // Reset file input so same file can be re-added if removed
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeEvidence(id: string) {
    setPendingEvidence((prev) => {
      const removed = prev.find((f) => f.id === id)
      if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }

  // ── Form submit ───────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    setGlobalError('')
    if (pendingEvidence.length === 0) {
      setEvidenceError('Attach at least one supporting document (delivery note, photo, etc.).')
      return
    }
    setIsSubmitting(true)
    try {
      if (isSupabase) {
        const deliveryId = await createDeliveryInSupabase({
          supplierOrgId: values.supplierId,
          plantOrgId: values.plantId,
          biomassType: values.biomassType,
          originLocation: values.originLocation,
          declaredQuantityT: values.declaredQuantityT,
          deliveryDate: values.deliveryDate,
          vehicleReference: values.vehicleReference ?? '',
          notes: values.notes ?? '',
        })
        await syncDeliveriesFromSupabase()
        navigate(`/deliveries/${deliveryId}`)
        return
      }

      const supplierName =
        availableSuppliers.find((s) => s.id === values.supplierId)?.name ?? values.supplierId
      const plantName =
        availablePlants.find((p) => p.id === values.plantId)?.name ?? values.plantId

      const delivery = addDelivery({
        supplierId: values.supplierId,
        supplierName,
        plantId: values.plantId,
        plantName,
        biomassType: values.biomassType,
        originLocation: values.originLocation,
        declaredQuantityT: values.declaredQuantityT,
        unit: 't',
        deliveryDate: values.deliveryDate,
        vehicleReference: values.vehicleReference ?? '',
        notes: values.notes ?? '',
        evidence: pendingEvidence,
      })
      navigate(`/deliveries/${delivery.id}`)
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : 'An unexpected error occurred.',
      )
      setIsSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Header
        title="Add a delivery"
        subtitle="Record a biomass load for the plant to check"
      />

      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-5">
          <Button asChild variant="outline" size="sm">
            <Link to="/deliveries">
              <ArrowLeft className="mr-1.5 size-3.5" />
              Back to deliveries
            </Link>
          </Button>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Parties */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Parties and route</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Supplier */}
                <div className="space-y-1.5">
                  <Label htmlFor="supplierId">Biomass supplier *</Label>
                  <Select
                    value={watchedSupplierId}
                    onValueChange={(v) => setValue('supplierId', v, { shouldValidate: true })}
                  >
                    <SelectTrigger id="supplierId" aria-invalid={!!errors.supplierId}>
                      <SelectValue placeholder="Select supplier…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSuppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} — {s.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ErrorMsg msg={errors.supplierId?.message} />
                </div>

                {/* Plant */}
                <div className="space-y-1.5">
                  <Label htmlFor="plantId">Destination plant *</Label>
                  <Select
                    value={watchedPlantId}
                    onValueChange={(v) => setValue('plantId', v, { shouldValidate: true })}
                  >
                    <SelectTrigger id="plantId" aria-invalid={!!errors.plantId}>
                      <SelectValue placeholder="Select plant…" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlants.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} — {p.location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ErrorMsg msg={errors.plantId?.message} />
                </div>
              </CardContent>
            </Card>

            {/* Biomass details */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Biomass details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Biomass type */}
                <div className="space-y-1.5">
                  <Label htmlFor="biomassType">Biomass type *</Label>
                  <Select
                    value={watchedBiomassType}
                    onValueChange={(v) => setValue('biomassType', v, { shouldValidate: true })}
                  >
                    <SelectTrigger id="biomassType" aria-invalid={!!errors.biomassType}>
                      <SelectValue placeholder="Select biomass type…" />
                    </SelectTrigger>
                    <SelectContent>
                      {BIOMASS_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <ErrorMsg msg={errors.biomassType?.message} />
                </div>

                {/* Origin */}
                <div className="space-y-1.5">
                  <Label htmlFor="originLocation">Origin / collection location *</Label>
                  <Input
                    id="originLocation"
                    placeholder="e.g. Ifo, Ogun State"
                    aria-invalid={!!errors.originLocation}
                    {...register('originLocation')}
                  />
                  <ErrorMsg msg={errors.originLocation?.message} />
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <Label htmlFor="declaredQuantityT">Declared weight (tonnes) *</Label>
                  <Input
                    id="declaredQuantityT"
                    type="number"
                    step="0.1"
                    min="0.1"
                    placeholder="e.g. 42.5"
                    aria-invalid={!!errors.declaredQuantityT}
                    {...register('declaredQuantityT', { valueAsNumber: true })}
                  />
                  <p className="text-xs text-muted-foreground">
                    This is the supplier's declared weight. The plant will record the
                    measured weight separately.
                  </p>
                  <ErrorMsg msg={errors.declaredQuantityT?.message} />
                </div>
              </CardContent>
            </Card>

            {/* Logistics */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Logistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="deliveryDate">Delivery date *</Label>
                  <Input
                    id="deliveryDate"
                    type="date"
                    aria-invalid={!!errors.deliveryDate}
                    {...register('deliveryDate')}
                  />
                  <ErrorMsg msg={errors.deliveryDate?.message} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="vehicleReference">
                    Vehicle / transport reference{' '}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="vehicleReference"
                    placeholder="e.g. LAG-482-KD"
                    {...register('vehicleReference')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">
                    Notes <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Any relevant notes about this delivery…"
                    rows={3}
                    {...register('notes')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Evidence upload */}
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-sm">Photos and papers for this load</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Attach at least one document. Accepted formats: PDF, JPG, PNG, WEBP (max 5 MB each).
                </p>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  {/* Kind selector */}
                  <Select
                    value={evidenceKind}
                    onValueChange={(v) => setEvidenceKind(v as EvidenceKind)}
                  >
                    <SelectTrigger className="h-11 w-full text-sm sm:w-52" aria-label="Evidence type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVIDENCE_KINDS.map((k) => (
                        <SelectItem key={k} value={k}>
                          {evidenceKindLabel(k)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* File input trigger */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 w-full sm:w-auto"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 size-3.5" />
                    Choose file
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={handleFileChange}
                    aria-label="Upload evidence file"
                  />
                </div>

                {evidenceError && (
                  <p className="text-xs text-destructive">{evidenceError}</p>
                )}

                {pendingEvidence.length > 0 && (
                  <ul className="space-y-2">
                    {pendingEvidence.map((f) => {
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
                            onClick={() => removeEvidence(f.id)}
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

                <p className="text-xs text-muted-foreground">
                  Files are stored locally in your browser session for this demo and are not
                  uploaded to cloud storage.
                </p>
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
                <Link to="/deliveries">Cancel</Link>
              </Button>
              <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  'Add delivery'
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </>
  )
}
