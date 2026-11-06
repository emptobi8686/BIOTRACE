import { useCallback, useEffect, useState } from 'react'
import { PackageCheck, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AdminShell, SimulatedNotice } from '@/pages/admin/AdminShell'
import { DATA_MODE } from '@/lib/data-access'
import { getSupabaseClient } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Batch {
  id: string
  plant_org_id: string
  plant_name?: string
  period_start: string
  period_end: string
  total_net_tco2e: number | null
  whole_credits: number | null
  rounding_remainder: number | null
  status: 'draft' | 'issued' | 'cancelled'
  issued_at: string | null
  created_at: string
  delivery_count?: number
}

interface ReviewedDelivery {
  id: string
  reference: string
  biomass_type: string
  measured_quantity_t: number | null
  plant_org_id: string
  snapshot_net_tco2e: number
}

interface CementPlant {
  id: string
  name: string
  eligibility_status: string | null
}

function BatchStatusBadge({ status }: { status: string }) {
  if (status === 'issued') return <span className="status-badge status-badge--verified"><CheckCircle2 className="size-3" aria-hidden />Issued</span>
  if (status === 'cancelled') return <span className="status-badge status-badge--rejected">Cancelled</span>
  return <span className="status-badge status-badge--pending"><Clock className="size-3" aria-hidden />Draft</span>
}

// ─── Create batch form ────────────────────────────────────────────────────────
function CreateBatchForm({
  plants,
  onCreated,
}: {
  plants: CementPlant[]
  onCreated: () => void
}) {
  const [plantId, setPlantId] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [deliveries, setDeliveries] = useState<ReviewedDelivery[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [snapshots, setSnapshots] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPlant = plants.find((p) => p.id === plantId)
  const isEligible = selectedPlant?.eligibility_status === 'eligible_simulated'

  async function loadDeliveries(pid: string) {
    if (!pid || DATA_MODE !== 'supabase') return
    setIsLoading(true)
    try {
      const { data, error: err } = await getSupabaseClient()
        .from('deliveries')
        .select('id, reference, biomass_type, measured_quantity_t, plant_org_id')
        .eq('plant_org_id', pid)
        .eq('status', 'reviewed')
        .order('updated_at', { ascending: false })
      if (err) throw err
      setDeliveries((data ?? []).map((d) => ({ ...d, snapshot_net_tco2e: 0 })))
      setSelected(new Set())
      setSnapshots({})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load deliveries.')
    } finally {
      setIsLoading(false)
    }
  }

  function toggleDelivery(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const totalTco2e = [...selected].reduce((sum, id) => sum + (snapshots[id] ?? 0), 0)
  const wholeCredits = Math.floor(totalTco2e)
  const remainder = totalTco2e - wholeCredits

  async function handleCreate() {
    if (!plantId || !periodStart || !periodEnd || selected.size === 0) {
      setError('Select a plant, period dates, and at least one delivery.')
      return
    }
    setError(null)
    setIsSaving(true)
    try {
      const sb = getSupabaseClient()
      // 1. Create draft batch
      const { data: batchId, error: createErr } = await sb.rpc('create_issuance_batch', {
        p_plant_org_id: plantId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_delivery_ids: [...selected],
      })
      if (createErr) throw createErr

      // 2. Update tCO2e snapshots for each selected delivery
      for (const did of selected) {
        const tco2e = snapshots[did] ?? 0
        await sb.rpc('update_batch_snapshot', {
          p_batch_id: batchId,
          p_delivery_id: did,
          p_net_tco2e: tco2e,
        })
      }

      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create batch.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader><CardTitle className="text-sm">Create new batch</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {!isEligible && plantId && (
          <div className="flex gap-2.5 rounded-lg border border-[color:var(--status-error)] bg-[color:var(--status-error-subtle)] px-3 py-2.5 text-xs text-[color:var(--status-error)]">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            This plant does not have <strong>eligible_simulated</strong> status. Issuance will be blocked by the database.
            Assess eligibility first on the Plant eligibility page.
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Cement plant</Label>
            <Select value={plantId} onValueChange={(v) => { setPlantId(v); void loadDeliveries(v) }}>
              <SelectTrigger><SelectValue placeholder="Select plant…" /></SelectTrigger>
              <SelectContent>
                {plants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.eligibility_status === 'eligible_simulated' ? ' ✓' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Period start</Label>
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Period end</Label>
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </div>
        </div>

        {plantId && (
          isLoading ? (
            <p className="text-sm text-muted-foreground" role="status">Loading reviewed deliveries…</p>
          ) : deliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviewed deliveries available for this plant that are not already in a batch.</p>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Select reviewed deliveries
              </p>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="py-2 pl-3 text-left">
                        <input type="checkbox" aria-label="Select all"
                          checked={selected.size === deliveries.length && deliveries.length > 0}
                          onChange={(e) => setSelected(e.target.checked ? new Set(deliveries.map((d) => d.id)) : new Set())} />
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Reference</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Biomass</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Measured (t)</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Net tCO₂e</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deliveries.map((d) => (
                      <tr key={d.id} className={cn('border-b border-border last:border-0', selected.has(d.id) && 'bg-primary/[0.03]')}>
                        <td className="py-2 pl-3">
                          <input type="checkbox" aria-label={`Select ${d.reference}`}
                            checked={selected.has(d.id)} onChange={() => toggleDelivery(d.id)} />
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{d.reference}</td>
                        <td className="px-3 py-2 text-muted-foreground">{d.biomass_type}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          {d.measured_quantity_t?.toFixed(1) ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {selected.has(d.id) ? (
                            <input
                              type="number" step="0.001" min="0"
                              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right text-xs tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={snapshots[d.id] ?? ''}
                              placeholder="0.000"
                              aria-label={`Net tCO2e for ${d.reference}`}
                              onChange={(e) => setSnapshots((prev) => ({ ...prev, [d.id]: parseFloat(e.target.value) || 0 }))}
                            />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selected.size > 0 && (
                <div className="flex flex-wrap gap-4 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Deliveries selected: </span>
                    <span className="font-semibold tabular-nums">{selected.size}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total net tCO₂e: </span>
                    <span className="font-semibold tabular-nums">{totalTco2e.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Whole credits (floor): </span>
                    <span className="font-semibold tabular-nums">{wholeCredits}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remainder: </span>
                    <span className="tabular-nums text-muted-foreground">{remainder.toFixed(4)}</span>
                  </div>
                  {totalTco2e < 1 && totalTco2e > 0 && (
                    <p className="w-full text-xs text-[color:var(--status-warning)]">
                      Total tCO₂e is below 1.0 — this batch cannot be issued.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        )}

        {error && <p role="alert" className="text-xs text-[color:var(--status-error)]">{error}</p>}

        <Button onClick={() => void handleCreate()} disabled={isSaving || selected.size === 0} size="sm">
          {isSaving ? 'Creating…' : 'Create draft batch'}
        </Button>
      </CardContent>
    </Card>
  )
}

// ─── Issue batch action ───────────────────────────────────────────────────────
function BatchCard({ batch, onIssued }: { batch: Batch; onIssued: () => void }) {
  const [isIssuing, setIsIssuing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleIssue() {
    setError(null)
    setIsIssuing(true)
    try {
      const { error: err } = await getSupabaseClient().rpc('issue_batch', { p_batch_id: batch.id })
      if (err) throw err
      onIssued()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to issue batch.')
    } finally {
      setIsIssuing(false)
    }
  }

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground font-mono">{batch.id.slice(0, 8)}…</p>
            <BatchStatusBadge status={batch.status} />
          </div>
          <p className="text-xs text-muted-foreground">
            {batch.plant_name ?? batch.plant_org_id.slice(0, 8)} ·{' '}
            {batch.period_start} → {batch.period_end}
          </p>
        </div>
        <p className="text-xs text-muted-foreground shrink-0">
          {new Date(batch.created_at).toLocaleDateString()}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {batch.total_net_tco2e != null && (
          <div className="flex flex-wrap gap-4 rounded-lg bg-muted/40 px-4 py-3 text-sm">
            <div><span className="text-muted-foreground">Total tCO₂e: </span><span className="font-semibold tabular-nums">{batch.total_net_tco2e.toFixed(4)}</span></div>
            <div><span className="text-muted-foreground">Whole credits: </span><span className="font-semibold tabular-nums">{batch.whole_credits}</span></div>
            <div><span className="text-muted-foreground">Remainder: </span><span className="tabular-nums text-muted-foreground">{batch.rounding_remainder?.toFixed(4)}</span></div>
          </div>
        )}
        {batch.issued_at && (
          <p className="text-xs text-muted-foreground">
            Issued (simulated): {new Date(batch.issued_at).toLocaleString()}
          </p>
        )}
        {error && <p role="alert" className="text-xs text-[color:var(--status-error)]">{error}</p>}
        {batch.status === 'draft' && (
          <div className="flex items-center gap-3">
            <Button size="sm" onClick={() => void handleIssue()} disabled={isIssuing}>
              {isIssuing ? 'Issuing…' : 'Issue batch — Registry (simulated)'}
            </Button>
            <p className="text-xs text-muted-foreground">No real registry interaction occurs.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function IssuanceBatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [plants, setPlants] = useState<CementPlant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    if (DATA_MODE !== 'supabase') { setIsLoading(false); return }
    try {
      const sb = getSupabaseClient()
      const [{ data: batchData, error: bErr }, { data: orgData, error: oErr }, { data: eligData }] =
        await Promise.all([
          sb.from('issuance_batches').select('*').order('created_at', { ascending: false }),
          sb.from('organizations').select('id, name').eq('organization_type', 'cement_plant'),
          sb.from('plant_eligibility_files').select('plant_org_id, status'),
        ])
      if (bErr) throw bErr
      if (oErr) throw oErr

      const orgMap = new Map((orgData ?? []).map((o) => [o.id, o.name]))
      const eligMap = new Map((eligData ?? []).map((e) => [e.plant_org_id, e.status]))

      setBatches((batchData ?? []).map((b) => ({ ...b, plant_name: orgMap.get(b.plant_org_id) })) as Batch[])
      setPlants((orgData ?? []).map((o) => ({ id: o.id, name: o.name, eligibility_status: eligMap.get(o.id) ?? null })))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load batches.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const draftCount  = batches.filter((b) => b.status === 'draft').length
  const issuedCount = batches.filter((b) => b.status === 'issued').length

  return (
    <AdminShell
      title="Issuance batches"
      subtitle="Batch-based simulated credit issuance"
      notice={
        <SimulatedNotice>
          <strong>Registry (simulated)</strong> — No real registry interaction occurs.
          No credits are issued to any external system. All figures are illustrative placeholder values.
          Issuance is blocked at the database level if the plant does not have{' '}
          <code>eligible_simulated</code> status.
        </SimulatedNotice>
      }
    >
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: 'Total batches', count: batches.length, style: 'text-foreground' },
          { label: 'Draft', count: draftCount, style: 'text-[color:var(--status-pending)]' },
          { label: 'Issued (simulated)', count: issuedCount, style: 'text-[color:var(--status-verified)]' },
        ].map(({ label, count, style }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-none">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className={cn('mt-1 text-2xl font-bold tabular-nums tracking-tight', style)}>{count}</p>
          </div>
        ))}
      </div>

      {error && <p role="alert" className="text-sm text-[color:var(--status-error)]">{error}</p>}

      {DATA_MODE !== 'supabase' ? (
        <Card className="shadow-none">
          <CardHeader><CardTitle className="text-sm">Demo mode</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Issuance batches require Supabase mode with migrations 007–008 applied.
              Batch creation validates plant eligibility at the database level — it cannot be
              bypassed from the frontend.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowCreate((v) => !v)} variant={showCreate ? 'outline' : 'default'}>
              {showCreate ? 'Cancel' : '+ New batch'}
            </Button>
          </div>

          {showCreate && (
            <CreateBatchForm plants={plants} onCreated={() => { setShowCreate(false); void load() }} />
          )}

          {isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">Loading batches…</p>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center">
              <PackageCheck className="mb-3 size-8 text-muted-foreground/40" aria-hidden />
              <p className="text-sm font-medium text-foreground">No batches yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {batches.map((b) => (
                <BatchCard key={b.id} batch={b} onIssued={() => void load()} />
              ))}
            </div>
          )}
        </>
      )}
    </AdminShell>
  )
}
