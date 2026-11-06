import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  FileQuestion,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { FormMessage } from '@/components/auth/AuthFrame'
import { DATA_MODE } from '@/lib/data-access'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/lib/use-auth'
import { useDemoSession } from '@/lib/demo-session'
import { organizationTypeLabel, verificationStatusLabel } from '@/lib/onboarding'
import { parseCacVerificationNote, verifyCacBusiness, type CacVerificationResult } from '@/lib/cac'
import { cn } from '@/lib/utils'

interface VerificationRecord {
  id: string
  organization_id: string
  status: string
  submitted_at: string
  decided_at: string | null
  decision_reason: string | null
  organizations: {
    id: string
    name: string
    organization_type: string
    registration_number: string | null
    contact_email: string | null
    phone: string | null
    business_address: string | null
    relevant_information: string | null
  } | null
}

type ReviewFilter = 'needs_review' | 'approved' | 'rejected' | 'additional_info' | 'all'

function StatusBadge({ status }: { status: string }) {
  const styleMap: Record<string, string> = {
    approved: 'status-badge status-badge--success',
    rejected: 'status-badge status-badge--rejected',
    under_review: 'status-badge status-badge--info',
    additional_information_required: 'status-badge status-badge--warning',
  }
  const IconMap: Record<string, typeof Clock> = {
    approved: CheckCircle2,
    rejected: XCircle,
    under_review: AlertCircle,
    additional_information_required: FileQuestion,
  }
  const cls = styleMap[status] ?? 'status-badge status-badge--pending'
  const Icon = IconMap[status] ?? Clock

  return (
    <span className={`${cls} font-medium uppercase tracking-[0.07em]`}>
      <Icon className="size-3.5" aria-hidden="true" />
      {verificationStatusLabel(status)}
    </span>
  )
}

function SupabaseAdminPage() {
  const { session } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [records, setRecords] = useState<VerificationRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isReviewing, setIsReviewing] = useState<string | null>(null)
  const [filter, setFilter] = useState<ReviewFilter>('needs_review')
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({})
  const [adminCacResults, setAdminCacResults] = useState<Record<string, CacVerificationResult>>({})
  const [isVerifyingCacOrgId, setIsVerifyingCacOrgId] = useState<string | null>(null)

  async function handleAdminVerifyCac(recordId: string, rc: string, orgName: string) {
    setIsVerifyingCacOrgId(recordId)
    try {
      const res = await verifyCacBusiness(rc, orgName)
      setAdminCacResults((prev) => ({ ...prev, [recordId]: res }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FastCAC lookup failed')
    } finally {
      setIsVerifyingCacOrgId(null)
    }
  }

  const loadRecords = useCallback(async () => {
    if (!session) return

    try {
      const { data: adminData, error: adminError } = await getSupabaseClient()
        .from('platform_admins')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (adminError) throw adminError
      if (!adminData) {
        setIsAdmin(false)
        setRecords([])
        setIsLoading(false)
        return
      }

      setIsAdmin(true)

      const { data, error: fetchError } = await getSupabaseClient()
        .from('organization_verifications')
        .select(
          'id, organization_id, status, submitted_at, decided_at, decision_reason, organizations(id, name, organization_type, registration_number, contact_email, phone, business_address, relevant_information)',
        )
        .order('submitted_at', { ascending: false })

      if (fetchError) throw fetchError
      setRecords((data ?? []) as VerificationRecord[])
      setError(null)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to load organization approvals.',
      )
      setIsAdmin(false)
    } finally {
      setIsLoading(false)
    }
  }, [session])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  async function handleReview(
    verificationId: string,
    targetStatus: 'approved' | 'rejected' | 'under_review' | 'additional_information_required',
  ) {
    if (!session) return

    const note = (decisionNotes[verificationId] ?? '').trim()

    // Validate reason requirement per database RPC rules
    if (
      (targetStatus === 'rejected' || targetStatus === 'additional_information_required') &&
      (!note || note.length > 2000)
    ) {
      setFieldErrors((prev) => ({
        ...prev,
        [verificationId]:
          'A decision note of 1 to 2000 characters is required when rejecting or requesting additional information.',
      }))
      return
    }

    setFieldErrors((prev) => ({ ...prev, [verificationId]: null }))
    setIsReviewing(verificationId)

    const finalReason =
      note ||
      (targetStatus === 'approved'
        ? 'Approved by platform administrator.'
        : targetStatus === 'under_review'
          ? 'Application placed under review by platform administrator.'
          : note)

    try {
      const { error: rpcError } = await getSupabaseClient().rpc(
        'review_organization_verification',
        {
          p_verification_id: verificationId,
          p_status: targetStatus,
          p_decision_reason: finalReason,
        },
      )

      if (rpcError) throw rpcError

      // Clear note for this record
      setDecisionNotes((prev) => {
        const next = { ...prev }
        delete next[verificationId]
        return next
      })

      await loadRecords()
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to update the organization status.',
      )
    } finally {
      setIsReviewing(null)
    }
  }

  if (!session) return <Navigate to="/login" replace />

  if (isLoading) {
    return (
      <main className="mx-auto flex min-h-svh max-w-5xl items-center justify-center px-4">
        <p role="status" className="text-sm text-muted-foreground">
          Loading administrator workspace…
        </p>
      </main>
    )
  }

  if (isAdmin === false) {
    return (
      <main className="mx-auto flex min-h-svh max-w-2xl items-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FormMessage>
              This account does not have platform administrator access. Platform administrators
              must be explicitly provisioned in the database.
            </FormMessage>
            <Button asChild>
              <Link to="/onboarding">Return to onboarding</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  const pendingCount = records.filter((r) => r.status === 'pending').length
  const underReviewCount = records.filter((r) => r.status === 'under_review').length
  const approvedCount = records.filter((r) => r.status === 'approved').length
  const actionRequiredCount = records.filter(
    (r) => r.status === 'additional_information_required',
  ).length
  const rejectedCount = records.filter((r) => r.status === 'rejected').length

  const filteredRecords = records.filter((record) => {
    if (filter === 'needs_review') {
      return ['pending', 'under_review'].includes(record.status)
    }
    if (filter === 'approved') return record.status === 'approved'
    if (filter === 'rejected') return record.status === 'rejected'
    if (filter === 'additional_info') return record.status === 'additional_information_required'
    return true
  })

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Platform Administration
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Organization verification</h1>
          <p className="text-sm text-muted-foreground">
            Review legal registration, operating permits, and role qualifications submitted by
            participant organizations.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/onboarding">Organizations</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/dashboard">Dashboard</Link>
          </Button>
        </div>
      </header>

      {/* Metrics overview */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="p-4 shadow-none">
          <p className="text-xs font-medium text-muted-foreground">Pending</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{pendingCount}</p>
        </Card>
        <Card className="p-4 shadow-none">
          <p className="text-xs font-medium text-muted-foreground">Under Review</p>
          <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color: 'var(--status-info)' }}>
            {underReviewCount}
          </p>
        </Card>
        <Card className="p-4 shadow-none">
          <p className="text-xs font-medium text-muted-foreground">Approved</p>
          <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color: 'var(--status-success)' }}>
            {approvedCount}
          </p>
        </Card>
        <Card className="p-4 shadow-none">
          <p className="text-xs font-medium text-muted-foreground">Info Requested</p>
          <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color: 'var(--status-warning)' }}>
            {actionRequiredCount}
          </p>
        </Card>
        <Card className="p-4 shadow-none">
          <p className="text-xs font-medium text-muted-foreground">Rejected</p>
          <p className="mt-1 text-2xl font-bold tracking-tight" style={{ color: 'var(--status-error)' }}>
            {rejectedCount}
          </p>
        </Card>
      </div>

      {error && <FormMessage>{error}</FormMessage>}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2" aria-label="Filter organization applications">
        {(
          [
            ['needs_review', `Needs review (${pendingCount + underReviewCount})`],
            ['approved', `Approved (${approvedCount})`],
            ['additional_info', `Info requested (${actionRequiredCount})`],
            ['rejected', `Rejected (${rejectedCount})`],
            ['all', `All (${records.length})`],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            type="button"
            variant={filter === value ? 'default' : 'outline'}
            size="sm"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {filteredRecords.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {filter === 'needs_review'
              ? 'No organization applications currently require review.'
              : `No ${filter === 'all' ? '' : `${filter.replace('_', ' ')} `}applications found.`}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredRecords.map((record) => {
            const organization = record.organizations
            if (!organization) return null

            const isPendingOrUnderReview = ['pending', 'under_review'].includes(record.status)
            const currentNote = decisionNotes[record.id] ?? ''
            const recordError = fieldErrors[record.id]
            const cacInfo =
              adminCacResults[record.id] ??
              parseCacVerificationNote(organization.relevant_information)

            return (
              <Card key={record.id} className="shadow-none">
                <CardHeader className="flex-row items-start justify-between gap-4 border-b pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="size-5 text-primary" aria-hidden="true" />
                      <CardTitle className="text-xl">{organization.name}</CardTitle>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {organizationTypeLabel(organization.organization_type)}
                      </span>{' '}
                      · Submitted {new Date(record.submitted_at).toLocaleString()}
                    </p>
                  </div>
                  <StatusBadge status={record.status} />
                </CardHeader>

                <CardContent className="space-y-5 pt-4">
                  {/* Organization details */}
                  <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-md border p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-foreground">
                        Registration Number
                      </p>
                      <p className="mt-1 font-mono text-sm text-foreground">
                        {organization.registration_number ?? 'Not provided'}
                      </p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-foreground">
                        Contact Email
                      </p>
                      <p className="mt-1 truncate text-sm text-foreground">
                        {organization.contact_email ?? 'Not provided'}
                      </p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-foreground">
                        Contact Phone
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {organization.phone ?? 'Not provided'}
                      </p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-foreground">
                        Business Address
                      </p>
                      <p className="mt-1 truncate text-sm text-foreground">
                        {organization.business_address ?? 'Not provided'}
                      </p>
                    </div>
                  </div>

                  {/* FastCAC Registry Verification Card */}
                  <div className="rounded-md border p-3.5 bg-card">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
                        <span className="text-xs font-semibold uppercase tracking-wide text-foreground">
                          CAC Registry Verification
                        </span>
                        {cacInfo ? (
                          <span
                            className={cn(
                              cacInfo.status === 'match'
                                ? 'status-badge status-badge--verified'
                                : 'status-badge status-badge--error',
                            )}
                          >
                            {cacInfo.status.toUpperCase()}{' '}
                            {cacInfo.isMock ? '(Sandbox Check)' : '(FastCAC Live)'}
                          </span>
                        ) : (
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                            Not Pre-verified
                          </span>
                        )}
                      </div>

                      {organization.registration_number && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          disabled={isVerifyingCacOrgId === record.id}
                          onClick={() =>
                            void handleAdminVerifyCac(
                              record.id,
                              organization.registration_number!,
                              organization.name,
                            )
                          }
                        >
                          {isVerifyingCacOrgId === record.id
                            ? 'Verifying with FastCAC…'
                            : 'Run Live CAC Check'}
                        </Button>
                      )}
                    </div>

                    {cacInfo && (
                      <div className="mt-2.5 grid gap-1.5 text-xs text-muted-foreground sm:grid-cols-2">
                        <p>
                          <span className="font-medium text-foreground">Official Legal Name:</span>{' '}
                          {cacInfo.companyName ?? organization.name}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">RC Number:</span>{' '}
                          {cacInfo.registrationNumber}
                        </p>
                        <p>
                          <span className="font-medium text-foreground">Verified At:</span>{' '}
                          {new Date(cacInfo.verifiedAt).toLocaleString()}
                        </p>
                        {cacInfo.companyType && (
                          <p>
                            <span className="font-medium text-foreground">Classification:</span>{' '}
                            {cacInfo.companyType}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Applicant-provided relevant information */}
                  {organization.relevant_information && (
                    <div className="rounded-md border bg-muted/30 p-4 text-sm">
                      <p className="mb-2 font-medium text-foreground">
                        Applicant-provided details & role credentials:
                      </p>
                      <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                        {organization.relevant_information}
                      </p>
                    </div>
                  )}

                  {/* Decision note history */}
                  {record.decision_reason && (
                    <div className="rounded-md border bg-muted/20 p-4 text-sm">
                      <p className="font-medium text-foreground">Decision note:</p>
                      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">
                        {record.decision_reason}
                      </p>
                      {record.decided_at && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Decided on {new Date(record.decided_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Active review controls */}
                  {isPendingOrUnderReview && (
                    <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/[0.02] p-4">
                      <div>
                        <label
                          htmlFor={`decision-note-${record.id}`}
                          className="block text-xs font-medium uppercase tracking-wide text-foreground"
                        >
                          Decision Note / Feedback
                        </label>
                        <p className="mb-2 text-xs text-muted-foreground">
                          Required when requesting additional information or rejecting the
                          application (1-2000 characters).
                        </p>
                        <Textarea
                          id={`decision-note-${record.id}`}
                          placeholder="e.g. Verified against CAC registry; or: Please upload your audited weighbridge calibration certificate..."
                          value={currentNote}
                          maxLength={2000}
                          onChange={(e) =>
                            setDecisionNotes((prev) => ({
                              ...prev,
                              [record.id]: e.target.value,
                            }))
                          }
                          className="min-h-20"
                        />
                        {recordError && (
                          <p role="alert" className="mt-1 text-xs text-destructive">
                            {recordError}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        {record.status === 'pending' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void handleReview(record.id, 'under_review')}
                            disabled={isReviewing === record.id}
                          >
                            {isReviewing === record.id ? 'Updating…' : 'Mark Under Review'}
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleReview(record.id, 'approved')}
                          disabled={isReviewing === record.id}
                        >
                          {isReviewing === record.id ? 'Updating…' : 'Approve Organization'}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-[color:var(--status-warning)] text-[color:var(--status-warning)] hover:bg-[color:var(--status-warning-subtle)]"
                          onClick={() =>
                            void handleReview(record.id, 'additional_information_required')
                          }
                          disabled={isReviewing === record.id}
                        >
                          {isReviewing === record.id ? 'Updating…' : 'Request More Information'}
                        </Button>

                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleReview(record.id, 'rejected')}
                          disabled={isReviewing === record.id}
                        >
                          {isReviewing === record.id ? 'Updating…' : 'Reject Application'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </main>
  )
}

function DemoAdminPage() {
  const { role } = useDemoSession()

  if (role !== 'administrator') {
    return (
      <main className="mx-auto flex min-h-svh max-w-2xl items-center px-4">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
          </CardHeader>
          <CardContent>
            <FormMessage>
              Demo admin access is available only to the platform administrator role. Switch to the
              Administrator role in the top-right role switcher to test this view.
            </FormMessage>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
            Administration (Demo Mode)
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Organization approvals</h1>
          <p className="text-sm text-muted-foreground">
            In demo mode, you can inspect the interface. To review live organizations with audit
            logging and PostgreSQL RLS, switch to Supabase mode.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/deliveries">View deliveries</Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Demo Environment Notice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Demo mode uses in-memory mock data to showcase the operational delivery, weighbridge,
            and auditor workflows without cloud database latency.
          </p>
          <p>
            To use the real multi-tenant verification workflow with legal registration numbers,
            admin audit logs, and CAC verification:
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>Configure Supabase credentials in <code className="rounded bg-muted px-1.5 py-0.5">.env.development.local</code></li>
            <li>Run the migration scripts to provision the database schema</li>
            <li>Use the admin portal to approve registered suppliers and cement plants</li>
          </ol>
        </CardContent>
      </Card>
    </main>
  )
}

export function AdminPage() {
  if (DATA_MODE === 'supabase') return <SupabaseAdminPage />
  return <DemoAdminPage />
}
