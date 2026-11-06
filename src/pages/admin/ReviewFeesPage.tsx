import { useCallback, useEffect, useState } from 'react'
import { ReceiptText, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AdminShell, SimulatedNotice } from '@/pages/admin/AdminShell'
import { DATA_MODE } from '@/lib/data-access'
import { getSupabaseClient } from '@/lib/supabase'

interface FeeSetting {
  id: string
  fee_amount: number
  currency: string
  effective_from: string
  set_by: string
}

interface FeeSnapshot {
  id: string
  delivery_id: string
  delivery_ref?: string
  fee_amount: number
  currency: string
  payer_org_id: string | null
  payer_name?: string
  status: string
  snapshot_at: string
}

function formatCurrency(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function ReviewFeesPage() {
  const [settings, setSettings] = useState<FeeSetting[]>([])
  const [snapshots, setSnapshots] = useState<FeeSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newAmount, setNewAmount] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (DATA_MODE !== 'supabase') { setIsLoading(false); return }
    try {
      const sb = getSupabaseClient()
      const [{ data: feeData, error: fErr }, { data: snapData, error: sErr }] = await Promise.all([
        sb.from('review_fee_settings').select('*').order('effective_from', { ascending: false }),
        sb.from('review_fee_snapshots').select('*').order('snapshot_at', { ascending: false }).limit(50),
      ])
      if (fErr) throw fErr
      if (sErr) throw sErr
      setSettings(feeData ?? [])
      setSnapshots(snapData ?? [])
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load fee data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function handleSetFee() {
    const parsed = parseFloat(newAmount)
    if (isNaN(parsed) || parsed < 0) {
      setError('Enter a valid fee amount (zero or positive number).')
      return
    }
    setError(null)
    setIsSaving(true)
    setSaveSuccess(false)
    try {
      const { error: rpcErr } = await getSupabaseClient().rpc('set_review_fee', {
        p_fee_amount: parsed,
        p_currency: 'NGN',
      })
      if (rpcErr) throw rpcErr
      setNewAmount('')
      setSaveSuccess(true)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to set fee.')
    } finally {
      setIsSaving(false)
    }
  }

  const currentFee = settings[0]

  return (
    <AdminShell
      title="Review fees"
      subtitle="Configure the flat review fee charged to cement plants"
      notice={
        <SimulatedNotice>
          Review fees are <strong>simulated</strong> — no real payment processing occurs.
          The fee is fixed per review and independent of the review decision. Reviewers do
          not receive a percentage of credit sales. Historical fee snapshots are preserved
          when the fee is changed.
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
              Review fee configuration requires Supabase mode with migration 009 applied.
              In demo mode the form is shown for interface preview only.
            </p>
            {/* Preview form */}
            <div className="mt-4 space-y-3 max-w-sm">
              <div className="space-y-1.5">
                <Label htmlFor="fee-preview">Review fee (NGN)</Label>
                <div className="flex gap-2">
                  <Input id="fee-preview" type="number" placeholder="e.g. 150000" disabled />
                  <Button size="sm" disabled>Set fee</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Current fee + set fee */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader><CardTitle className="text-sm">Current review fee</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <p role="status" className="text-sm text-muted-foreground">Loading…</p>
                ) : currentFee ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">
                      {formatCurrency(currentFee.fee_amount, currentFee.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Per review · Set {new Date(currentFee.effective_from).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Payer: Cement plant · Independent of review decision
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No fee configured yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader><CardTitle className="text-sm">Set new fee</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="new-fee">Amount (NGN)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-fee"
                      type="number"
                      min="0"
                      step="100"
                      placeholder="e.g. 150000"
                      value={newAmount}
                      onChange={(e) => setNewAmount(e.target.value)}
                    />
                    <Button size="sm" onClick={() => void handleSetFee()} disabled={isSaving}>
                      {isSaving ? 'Saving…' : 'Set fee'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Previous fee settings are preserved in history.
                  </p>
                </div>
                {saveSuccess && (
                  <div className="flex items-center gap-2 text-xs text-[color:var(--status-success)]">
                    <CheckCircle2 className="size-3.5" aria-hidden />
                    Fee updated successfully.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Fee history */}
          <Card className="shadow-none">
            <CardHeader><CardTitle className="text-sm">Fee setting history</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? (
                <p role="status" className="text-sm text-muted-foreground">Loading…</p>
              ) : settings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No fee settings recorded.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Amount</th>
                        <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Currency</th>
                        <th className="py-2 text-left font-medium text-muted-foreground">Effective from</th>
                      </tr>
                    </thead>
                    <tbody>
                      {settings.map((s, i) => (
                        <tr key={s.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-4 tabular-nums font-medium">
                            {s.fee_amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                            {i === 0 && <span className="ml-2 status-badge status-badge--success text-[9px] py-px">Current</span>}
                          </td>
                          <td className="py-2 pr-4 text-muted-foreground">{s.currency}</td>
                          <td className="py-2 text-muted-foreground">{new Date(s.effective_from).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent fee snapshots */}
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-sm">Recent fee snapshots</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                The fee is locked at review time and retained even if the platform fee later changes.
                Payment status is simulated — no real payment processing occurs.
              </p>
              {isLoading ? (
                <p role="status" className="text-sm text-muted-foreground">Loading…</p>
              ) : snapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-10 text-center">
                  <ReceiptText className="mb-3 size-8 text-muted-foreground/40" aria-hidden />
                  <p className="text-sm text-muted-foreground">No fee snapshots recorded yet.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Delivery</th>
                        <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Fee locked</th>
                        <th className="py-2 pr-4 text-left font-medium text-muted-foreground">Status</th>
                        <th className="py-2 text-left font-medium text-muted-foreground">Snapshot at</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshots.map((s) => (
                        <tr key={s.id} className="border-b border-border/50 last:border-0">
                          <td className="py-2 pr-4 font-mono text-xs">{s.delivery_id.slice(0, 8)}…</td>
                          <td className="py-2 pr-4 tabular-nums">
                            {formatCurrency(s.fee_amount, s.currency)}
                          </td>
                          <td className="py-2 pr-4">
                            <span className={s.status === 'simulated_paid'
                              ? 'status-badge status-badge--success text-[10px]'
                              : 'status-badge status-badge--pending text-[10px]'}>
                              {s.status === 'simulated_paid' ? 'Simulated paid' : 'Pending (simulated)'}
                            </span>
                          </td>
                          <td className="py-2 text-muted-foreground">{new Date(s.snapshot_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </AdminShell>
  )
}
