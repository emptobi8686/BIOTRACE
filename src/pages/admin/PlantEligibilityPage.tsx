import { useCallback, useEffect, useState } from 'react'
import { Leaf, CheckCircle2, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AdminShell, SimulatedNotice } from '@/pages/admin/AdminShell'
import { DATA_MODE } from '@/lib/data-access'
import { getSupabaseClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
interface EligibilityFile {
  id: string
  plant_org_id: string
  plant_name: string
  status: 'not_assessed' | 'eligible_simulated' | 'blocked'
  clinker_facility_exists: boolean | null
  baseline_fuel_mix: string | null
  first_alt_fuel_date: string | null
  investment_evidence: string | null
  baseline_biomass_fate: string | null
  baseline_fate_evidence: string | null
  admin_note: string | null
  assessed_at: string | null
}

interface CementPlant {
  id: string
  name: string
  eligibility_file: EligibilityFile | null
}

const STATUS_LABELS: Record<string, string> = {
  not_assessed: 'Not assessed',
  eligible_simulated: 'Eligible (simulated)',
  blocked: 'Blocked',
}

const FATE_OPTIONS = [
  { value: 'dumped', label: 'Dumped' },
  { value: 'burned_open', label: 'Burned in open' },
  { value: 'sold', label: 'Sold to others' },
  { value: 'other', label: 'Other' },
]

function StatusBadge({ status }: { status: string }) {
  if (status === 'eligible_simulated') {
    return (
      <span className="status-badge status-badge--success">
        <CheckCircle2 className="size-3" aria-hidden />
        {STATUS_LABELS[status]}
      </span>
    )
  }
  if (status === 'blocked') {
    return (
      <span className="status-badge status-badge--error">
        <XCircle className="size-3" aria-hidden />
        {STATUS_LABELS[status]}
      </span>
    )
  }
  return (
    <span className="status-badge status-badge--pending">
      <Clock className="size-3" aria-hidden />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

// ─── Assessment form ──────────────────────────────────────────────────────────
function AssessmentForm({
  plant,
  onSaved,
}: {
  plant: CementPlant
  onSaved: () => void
}) {
  const existing = plant.eligibility_file
  const [status, setStatus] = useState<string>(existing?.status ?? 'not_assessed')
  const [clinker, setClinker] = useState<string>(
    existing?.clinker_facility_exists == null ? '' :
    existing.clinker_facility_exists ? 'yes' : 'no',
  )
  const [fuelMix, setFuelMix] = useState(existing?.baseline_fuel_mix ?? '')
  const [altFuelDate, setAltFuelDate] = useState(existing?.first_alt_fuel_date ?? '')
  const [investEvidence, setInvestEvidence] = useState(existing?.investment_evidence ?? '')
  const [biomassFate, setBiomassFate] = useState(existing?.baseline_biomass_fate ?? '')
  const [fateEvidence, setFateEvidence] = useState(existing?.baseline_fate_evidence ?? '')
  const [adminNote, setAdminNote] = useState(existing?.admin_note ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setError(null)
    setIsSaving(true)
    try {
      const { error: rpcError } = await getSupabaseClient().rpc('assess_plant_eligibility', {
        p_plant_org_id: plant.id,
        p_status: status,
        p_clinker_facility_exists: clinker === 'yes' ? true : clinker === 'no' ? false : null,
        p_baseline_fuel_mix: fuelMix || null,
        p_first_alt_fuel_date: altFuelDate || null,
        p_investment_evidence: investEvidence || null,
        p_baseline_biomass_fate: biomassFate || null,
        p_baseline_fate_evidence: fateEvidence || null,
        p_admin_note: adminNote || null,
      })
      if (rpcError) throw rpcError
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save eligibility assessment.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{plant.name}</p>
          <p className="text-xs text-muted-foreground">Cement plant · {plant.id.slice(0, 8)}…</p>
        </div>
        <StatusBadge status={existing?.status ?? 'not_assessed'} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`status-${plant.id}`}>Eligibility status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger id={`status-${plant.id}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="not_assessed">Not assessed</SelectItem>
              <SelectItem value="eligible_simulated">Eligible (simulated)</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`clinker-${plant.id}`}>Existing clinker facility</Label>
          <Select value={clinker} onValueChange={setClinker}>
            <SelectTrigger id={`clinker-${plant.id}`}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">Yes</SelectItem>
              <SelectItem value="no">No</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`fuel-${plant.id}`}>Baseline fuel mix</Label>
          <Input id={`fuel-${plant.id}`} value={fuelMix}
            onChange={(e) => setFuelMix(e.target.value)}
            placeholder="e.g. Coal 70%, Petcoke 30%" maxLength={300} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`altdate-${plant.id}`}>Date alternative fuels first used</Label>
          <Input id={`altdate-${plant.id}`} type="date" value={altFuelDate}
            onChange={(e) => setAltFuelDate(e.target.value)} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`invest-${plant.id}`}>Evidence of significant investment</Label>
          <Textarea id={`invest-${plant.id}`} value={investEvidence}
            onChange={(e) => setInvestEvidence(e.target.value)}
            placeholder="Describe capital expenditure or documented commitment…" rows={2} maxLength={2000} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`fate-${plant.id}`}>Baseline fate of biomass</Label>
          <Select value={biomassFate} onValueChange={setBiomassFate}>
            <SelectTrigger id={`fate-${plant.id}`}>
              <SelectValue placeholder="Select…" />
            </SelectTrigger>
            <SelectContent>
              {FATE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`fateev-${plant.id}`}>Baseline fate evidence</Label>
          <Input id={`fateev-${plant.id}`} value={fateEvidence}
            onChange={(e) => setFateEvidence(e.target.value)}
            placeholder="Reference or description of evidence" maxLength={500} />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`note-${plant.id}`}>Administrator note</Label>
          <Textarea id={`note-${plant.id}`} value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Internal assessment notes…" rows={2} maxLength={2000} />
        </div>
      </div>

      {existing?.assessed_at && (
        <p className="text-xs text-muted-foreground">
          Last assessed: {new Date(existing.assessed_at).toLocaleString()}
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-[color:var(--status-error)]">{error}</p>
      )}

      <Button onClick={() => void handleSave()} disabled={isSaving} size="sm">
        {isSaving ? 'Saving…' : 'Save assessment'}
      </Button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function PlantEligibilityPage() {
  const [plants, setPlants] = useState<CementPlant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (DATA_MODE !== 'supabase') { setIsLoading(false); return }
    try {
      const sb = getSupabaseClient()
      // Load all cement plant orgs
      const { data: orgs, error: orgErr } = await sb
        .from('organizations')
        .select('id, name')
        .eq('organization_type', 'cement_plant')
        .order('name')
      if (orgErr) throw orgErr

      // Load all eligibility files
      const { data: files, error: fileErr } = await sb
        .from('plant_eligibility_files')
        .select('*')
      if (fileErr) throw fileErr

      const fileMap = new Map((files ?? []).map((f) => [f.plant_org_id, f]))

      setPlants(
        (orgs ?? []).map((o) => ({
          id: o.id,
          name: o.name,
          eligibility_file: (fileMap.get(o.id) as EligibilityFile | undefined) ?? null,
        })),
      )
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load plant eligibility data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const eligible = plants.filter((p) => p.eligibility_file?.status === 'eligible_simulated').length
  const blocked  = plants.filter((p) => p.eligibility_file?.status === 'blocked').length
  const pending  = plants.filter((p) => !p.eligibility_file || p.eligibility_file.status === 'not_assessed').length

  return (
    <AdminShell
      title="Plant eligibility"
      subtitle="Assess cement plants for simulated issuance eligibility"
      backTo="/admin"
      notice={
        <SimulatedNotice>
          Eligibility is simulated and not assessed by a standards body.
          The demonstration plant is explicitly hypothetical. Marking a plant as{' '}
          <strong>Eligible (simulated)</strong> is required before creating an issuance batch,
          but does not constitute formal methodology approval.
        </SimulatedNotice>
      }
    >
      {/* Summary row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Eligible (simulated)', count: eligible, style: 'text-[color:var(--status-success)]' },
          { label: 'Blocked',              count: blocked,  style: 'text-[color:var(--status-error)]' },
          { label: 'Not assessed',         count: pending,  style: 'text-foreground' },
        ].map(({ label, count, style }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-none">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={cn('mt-1 text-2xl font-bold tabular-nums tracking-tight', style)}>{count}</p>
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-[color:var(--status-error)]">{error}</p>
      )}

      {isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">Loading cement plants…</p>
      ) : DATA_MODE !== 'supabase' ? (
        <Card className="shadow-none">
          <CardHeader><CardTitle className="text-sm">Demo mode</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Plant eligibility assessment requires Supabase mode and migrations 007–008
              applied to the Development database. In demo mode the assessment form is
              shown below for interface preview only — no data is persisted.
            </p>
            {/* Show a single demo preview card */}
            <div className="mt-4">
              <AssessmentForm
                plant={{ id: 'demo-plant-1', name: 'Lafarge Ewekoro Plant (demo)', eligibility_file: null }}
                onSaved={() => undefined}
              />
            </div>
          </CardContent>
        </Card>
      ) : plants.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center">
          <Leaf className="mb-3 size-8 text-muted-foreground/40" aria-hidden />
          <p className="text-sm font-medium text-foreground">No cement plants registered</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Register and approve a cement plant organization to create an eligibility file.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {plants.map((plant) => (
            <AssessmentForm key={plant.id} plant={plant} onSaved={() => void load()} />
          ))}
        </div>
      )}
    </AdminShell>
  )
}
