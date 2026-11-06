import { useCallback, useEffect, useState } from 'react'
import { DollarSign, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminShell, SimulatedNotice } from '@/pages/admin/AdminShell'
import { DATA_MODE } from '@/lib/data-access'
import { getSupabaseClient } from '@/lib/supabase'

interface AllocationRecord {
  id: string
  batch_id: string
  payee_type: 'plant' | 'supplier' | 'platform'
  payee_org_id: string | null
  payee_name?: string
  allocation_basis: string
  basis_value: number | null
  amount: number
  currency: string
  status: string
  created_at: string
}

interface IssuedBatch {
  id: string
  plant_org_id: string
  plant_name?: string
  period_start: string
  period_end: string
  total_net_tco2e: number
  whole_credits: number
  has_allocations: boolean
}

const PAYEE_LABELS: Record<string, string> = {
  plant: 'Plant (project owner)',
  supplier: 'Biomass supplier',
  platform: 'Platform fee',
}

const BASIS_LABELS: Record<string, string> = {
  project_owner: 'Project owner',
  delivery_tonnes: 'Delivery tonnes',
  platform_fee: 'Platform fee %',
}

function formatCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
}

// ─── Create allocations form ──────────────────────────────────────────────────
function CreateAllocationsForm({
  batch,
  onCreated,
}: {
  batch: IssuedBatch
  onCreated: () => void
}) {
  const [plantAmount, setPlantAmount] = useState('')
  const [platformAmount, setPlatformAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setError(null)
    const plant = parseFloat(plantAmount) || 0
    const platform = parseFloat(platformAmount) || 0
    setIsSaving(true)
    try {
      const { error: rpcErr } = await getSupabaseClient().rpc('create_sale_allocations', {
        p_batch_id: batch.id,
        p_plant_amount: plant,
        p_platform_amount: platform,
        p_platform_fee_pct: 0.10,
        p_per_supplier_amounts: null,
      })
      if (rpcErr) throw rpcErr
      onCreated()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create allocations.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold text-foreground">
        Create placeholder allocations for batch {batch.id.slice(0, 8)}…
      </p>
      <p className="text-xs text-muted-foreground">
        All amounts are PLACEHOLDER values. No real money is transferred.
        Reviewers are not included as beneficiaries.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`plant-${batch.id}`}>Plant amount (NGN) — placeholder</Label>
          <Input id={`plant-${batch.id}`} type="number" min="0" step="1000"
            placeholder="e.g. 2000000"
            value={plantAmount} onChange={(e) => setPlantAmount(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`platform-${batch.id}`}>Platform fee (NGN) — placeholder</Label>
          <Input id={`platform-${batch.id}`} type="number" min="0" step="100"
            placeholder="e.g. 200000"
            value={platformAmount} onChange={(e) => setPlatformAmount(e.target.value)} />
        </div>
      </div>
      {error && <p role="alert" className="text-xs text-[color:var(--status-error)]">{error}</p>}
      <Button size="sm" onClick={() => void handleCreate()} disabled={isSaving}>
        {isSaving ? 'Saving…' : 'Create allocation records (simulated)'}
      </Button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function SaleAllocationsPage() {
  const [batches, setBatches] = useState<IssuedBatch[]>([])
  const [allocations, setAllocations] = useState<AllocationRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandBatch, setExpandBatch] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (DATA_MODE !== 'supabase') { setIsLoading(false); return }
    try {
      const sb = getSupabaseClient()
      const [
        { data: batchData, error: bErr },
        { data: allocData, error: aErr },
        { data: orgData },
      ] = await Promise.all([
        sb.from('issuance_batches').select('*').eq('status', 'issued').order('issued_at', { ascending: false }),
        sb.from('sale_allocation_records').select('*').order('created_at', { ascending: false }),
        sb.from('organizations').select('id, name'),
      ])
      if (bErr) throw bErr
      if (aErr) throw aErr

      const orgMap = new Map((orgData ?? []).map((o) => [o.id, o.name]))
      const batchHasAllocations = new Set((allocData ?? []).map((a) => a.batch_id))

      setBatches((batchData ?? []).map((b) => ({
        ...b,
        plant_name: orgMap.get(b.plant_org_id),
        has_allocations: batchHasAllocations.has(b.id),
      })) as IssuedBatch[])
      setAllocations((allocData ?? []).map((a) => ({
        ...a,
        payee_name: a.payee_org_id ? orgMap.get(a.payee_org_id) : 'Platform',
      })) as AllocationRecord[])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load allocation data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0)

  return (
    <AdminShell
      title="Sale allocations"
      subtitle="Simulated sale proceeds allocation records"
      notice={
        <SimulatedNotice>
          <strong>ALL ALLOCATION FIGURES ARE PLACEHOLDER SIMULATIONS.</strong>{' '}
          No real money has been or will be transferred. Allocation percentages and monetary
          values are illustrative only. Reviewers are not included as payout beneficiaries.
          Records are append-only once created.
        </SimulatedNotice>
      }
    >
      {error && (
        <p role="alert" className="text-sm text-[color:var(--status-error)]">{error}</p>
      )}

      {DATA_MODE !== 'supabase' ? (
        <Card className="shadow-none">
          <CardHeader><CardTitle className="text-sm">Demo mode</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Sale allocation records require Supabase mode with migrations 008 and 010
              applied. Allocations are created after a batch is issued.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: 'Issued batches', value: batches.length, unit: '' },
              { label: 'Allocation records', value: allocations.length, unit: '' },
              { label: 'Total allocated (placeholder)', value: totalAllocated.toLocaleString('en-NG', { minimumFractionDigits: 0 }), unit: 'NGN' },
            ].map(({ label, value, unit }) => (
              <div key={label} className="rounded-xl border border-border bg-card p-4 shadow-none">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-bold tracking-tight text-foreground">
                  {unit && <span className="mr-1 text-sm font-normal text-muted-foreground">{unit}</span>}
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Issued batches needing allocations */}
          {isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">Loading…</p>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-14 text-center">
              <DollarSign className="mb-3 size-8 text-muted-foreground/40" aria-hidden />
              <p className="text-sm font-medium text-foreground">No issued batches yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Allocations are created after a batch is issued.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Issued batches
              </h2>
              {batches.map((batch) => {
                const batchAllocations = allocations.filter((a) => a.batch_id === batch.id)
                return (
                  <Card key={batch.id} className="shadow-none">
                    <CardHeader
                      className="cursor-pointer select-none"
                      onClick={() => setExpandBatch(expandBatch === batch.id ? null : batch.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">
                              {batch.plant_name ?? batch.plant_org_id.slice(0, 8)}
                            </p>
                            <span className="status-badge status-badge--success text-[10px]">Issued</span>
                            {batchAllocations.length === 0 && (
                              <span className="status-badge status-badge--warning text-[10px]">
                                <AlertTriangle className="size-2.5" aria-hidden />
                                No allocations
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {batch.period_start} → {batch.period_end} ·{' '}
                            {batch.whole_credits} whole credits ·{' '}
                            {batch.total_net_tco2e.toFixed(4)} tCO₂e (simulated)
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {expandBatch === batch.id ? '▲' : '▼'}
                        </span>
                      </div>
                    </CardHeader>

                    {expandBatch === batch.id && (
                      <CardContent className="space-y-4 pt-0">
                        {batchAllocations.length === 0 ? (
                          <CreateAllocationsForm
                            batch={batch}
                            onCreated={() => void load()}
                          />
                        ) : (
                          <>
                            <p className="text-xs text-muted-foreground">
                              Allocation records (all simulated — no real money transferred):
                            </p>
                            <div className="overflow-x-auto rounded-lg border border-border">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-border bg-muted/40">
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Payee</th>
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Type</th>
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Basis</th>
                                    <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount (placeholder)</th>
                                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {batchAllocations.map((a) => (
                                    <tr key={a.id} className="border-b border-border/50 last:border-0">
                                      <td className="px-3 py-2 font-medium text-foreground">
                                        {a.payee_name ?? (a.payee_type === 'platform' ? 'Platform' : a.payee_org_id?.slice(0, 8))}
                                      </td>
                                      <td className="px-3 py-2 text-muted-foreground">
                                        {PAYEE_LABELS[a.payee_type] ?? a.payee_type}
                                      </td>
                                      <td className="px-3 py-2 text-muted-foreground">
                                        {BASIS_LABELS[a.allocation_basis] ?? a.allocation_basis}
                                        {a.basis_value != null && ` (${a.basis_value})`}
                                      </td>
                                      <td className="px-3 py-2 text-right tabular-nums font-medium">
                                        {formatCurrency(a.amount, a.currency)}
                                      </td>
                                      <td className="px-3 py-2">
                                        <span className="status-badge status-badge--warning text-[9px] uppercase tracking-wider">
                                          {a.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                                <tfoot>
                                  <tr className="border-t border-border bg-muted/30">
                                    <td colSpan={3} className="px-3 py-2 text-xs font-semibold text-muted-foreground">
                                      Total (placeholder)
                                    </td>
                                    <td className="px-3 py-2 text-right tabular-nums text-sm font-bold text-foreground">
                                      {formatCurrency(batchAllocations.reduce((s, a) => s + a.amount, 0), 'NGN')}
                                    </td>
                                    <td />
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                            <p className="text-[11px] text-muted-foreground/70">
                              Records are append-only. Amounts are PLACEHOLDER values. No real money transferred.
                              Reviewer not included as a beneficiary.
                            </p>
                          </>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </AdminShell>
  )
}
