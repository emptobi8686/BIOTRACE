import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  LogOut,
  Check,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Building2,
  ClipboardCheck,
  Layers,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { FormMessage, LoadingSpinner } from '@/components/auth/AuthFrame'
import { BiotraceMark } from '@/components/brand/BiotraceMark'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/lib/use-auth'
import { verifyCacBusiness, formatCacVerificationNote, type CacVerificationResult } from '@/lib/cac'
import {
  organizationInformationSchema,
  organizationRegistrationSchema,
  emptyRoleDetails,
  organizationTypeLabel,
  organizationTypeFromValue,
  organizationTypeSchema,
  organizationTypes,
  personalInformationSchema,
  roleDetailsForOrganizationType,
  supportingInformationSchema,
  validateRoleDetails,
  verificationStatusLabel,
  type OrganizationRegistration,
  type OrganizationRoleDetails,
  type OrganizationType,
} from '@/lib/onboarding'
import {
  registerOrganization,
  type OnboardingOrganization,
} from '@/lib/organizations'
import { getSupabaseClient } from '@/lib/supabase'
import { useOrganizations } from '@/lib/organization-context'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

// ─── Step definitions ─────────────────────────────────────────────────────────
const steps = [
  'Personal information',
  'Organization type',
  'Organization information',
  'Role-specific details',
  'Supporting information',
  'Review and submit',
]

const initialForm: OrganizationRegistration = {
  fullName: '',
  organizationType: 'supplier',
  organizationName: '',
  registrationNumber: '',
  contactEmail: '',
  phone: '',
  businessAddress: '',
  relevantInformation: '',
  roleDetails: emptyRoleDetails,
}

// ─── Org type icon map ────────────────────────────────────────────────────────
const orgTypeIcons: Record<OrganizationType, typeof Building2> = {
  supplier: Layers,
  biomass_aggregator: Truck,
  cement_plant: Building2,
  independent_reviewer: ClipboardCheck,
  carbon_buyer: ShoppingBag,
}

// ─── Field wrapper ────────────────────────────────────────────────────────────
function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

// ─── Summary row ─────────────────────────────────────────────────────────────
function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-border/60 pb-2.5 last:border-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="break-words text-sm text-foreground">{value}</dd>
    </div>
  )
}

// ─── Role-specific fields ─────────────────────────────────────────────────────
function RoleDetailsFields({
  organizationType,
  details,
  onChange,
}: {
  organizationType: OrganizationType
  details: OrganizationRoleDetails
  onChange: <K extends keyof OrganizationRoleDetails>(key: K, value: OrganizationRoleDetails[K]) => void
}) {
  function textField(
    key: Exclude<keyof OrganizationRoleDetails, 'conflictOfInterestDeclared'>,
    label: string,
    maxLength: number,
    multiline = false,
    hint?: string,
  ) {
    const id = `role-${key}`
    return (
      <Field key={key} id={id} label={label} hint={hint}>
        {multiline ? (
          <Textarea id={id} required maxLength={maxLength} value={details[key]}
            onChange={(e) => onChange(key, e.target.value)} />
        ) : (
          <Input id={id} required maxLength={maxLength} value={details[key]}
            onChange={(e) => onChange(key, e.target.value)} />
        )}
      </Field>
    )
  }

  if (organizationType === 'cement_plant') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Facility and operations information used to assess your organization.
        </p>
        {textField('facilityName', 'Facility name', 200)}
        {textField('facilityLocation', 'Facility location', 500, true)}
        {textField('authorizedRepresentative', 'Authorized representative', 200)}
        {textField('operationalPermits', 'Operational or environmental permits', 2000, true)}
      </div>
    )
  }

  if (organizationType === 'independent_reviewer') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Accreditation and qualification information. These details are applicant-provided
          and are not independently verified at this stage.
        </p>
        {textField('accreditationBody', 'Accreditation body', 200)}
        {textField('accreditationNumber', 'Certificate or accreditation number', 200)}
        {textField('accreditationScope', 'Accreditation scope', 1000, true)}
        {textField('standardsAffiliation', 'Verra or Gold Standard VVB affiliation (or "Not applicable")', 500, true)}
        {textField('registryReference', 'Official registry reference (or explain if unavailable)', 500, true)}
        {textField('auditorQualifications', 'Auditor qualifications and credentials', 2000, true)}
        <label className="flex items-start gap-3 text-sm leading-6">
          <input
            type="checkbox"
            className="mt-1 size-4 accent-primary"
            checked={details.conflictOfInterestDeclared}
            onChange={(e) => onChange('conflictOfInterestDeclared', e.target.checked)}
          />
          <span>
            I acknowledge the conflict-of-interest declaration required for reviewer onboarding.
          </span>
        </label>
      </div>
    )
  }

  if (organizationType === 'supplier') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Describe your supply and sourcing. Statements are applicant-provided and are not
          independently verified.
        </p>
        {textField('businessType', 'Supplier business type', 200)}
        {textField('biomassCategories', 'Biomass categories supplied', 1000, true)}
        {textField('sourcingLocations', 'Biomass sourcing locations', 1000, true)}
        {textField('supplyCapacity', 'Estimated supply capacity and units', 300, true)}
        {textField('sourceDocumentation', 'Available source documentation', 1000, true)}
        {textField('sustainabilityEvidence', 'Sustainability evidence (or "Not available")', 1000, true)}
      </div>
    )
  }

  return (
    <p className="text-sm text-muted-foreground">
      No additional role-specific information is required for this organization type.
    </p>
  )
}

// ─── Verification status card ─────────────────────────────────────────────────
function VerificationCard({ organization }: { organization: OnboardingOrganization }) {
  const navigate = useNavigate()
  const { setActiveOrganizationId } = useOrganizations()
  const status = organization.verificationStatus

  const statusStyles: Record<string, string> = {
    approved: 'status-badge status-badge--success',
    rejected: 'status-badge status-badge--error',
    additional_information_required: 'status-badge status-badge--warning',
    under_review: 'status-badge status-badge--info',
    pending: 'status-badge status-badge--pending',
  }
  const badgeClass = statusStyles[status ?? ''] ?? 'status-badge status-badge--pending'

  return (
    <Card className="shadow-none">
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <CardTitle className="break-words">{organization.name}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {organizationTypeLabel(organization.organizationType)} · Organization owner
          </p>
        </div>
        <span className={badgeClass}>
          {status ? verificationStatusLabel(status) : 'Incomplete'}
        </span>
      </CardHeader>

      {organization.decisionReason && (
        <CardContent>
          <p className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Administrator note:</span>{' '}
            {organization.decisionReason}
          </p>
        </CardContent>
      )}

      {(status === 'pending' || status === 'under_review') && (
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your application is in the verification queue. Platform administrators will review
            your business registration and supporting details. Once approved, your workspace
            will be unlocked.
          </p>
        </CardContent>
      )}

      {status === 'additional_information_required' && (
        <CardContent>
          <p className="text-sm leading-relaxed text-[color:var(--status-warning)]">
            The platform administrator has requested additional details. See the note above.
          </p>
        </CardContent>
      )}

      {status === 'rejected' && (
        <CardContent>
          <p className="text-sm leading-relaxed text-[color:var(--status-error)]">
            This application could not be approved. Review the administrator note above.
          </p>
        </CardContent>
      )}

      {status === 'approved' && (
        <CardContent>
          <Button
            type="button"
            onClick={() => {
              setActiveOrganizationId(organization.id)
              navigate(`/workspace/${organization.id}`)
            }}
          >
            Open organization workspace
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Organization list ────────────────────────────────────────────────────────
function OrganizationList({
  organizations,
  onRegister,
}: {
  organizations: OnboardingOrganization[]
  onRegister: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Your organizations</h2>
      </div>
      {organizations.map((org) => (
        <VerificationCard key={org.id} organization={org} />
      ))}
      <div className="pt-2">
        <Button type="button" variant="outline" onClick={onRegister}>
          Register another organization
        </Button>
      </div>
    </div>
  )
}

// ─── Main OnboardingPage ──────────────────────────────────────────────────────
export function OnboardingPage() {
  const { session, profile, refreshProfile } = useAuth()
  const {
    organizations,
    setActiveOrganizationId,
    isLoading: isLoadingOrganizations,
    error: loadError,
    refreshOrganizations,
  } = useOrganizations()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const selectedOrganizationType =
    organizationTypeFromValue(searchParams.get('organizationType')) ??
    organizationTypeFromValue(session?.user.user_metadata.organization_type)

  const [form, setForm] = useState<OrganizationRegistration>(() => ({
    ...initialForm,
    organizationType: selectedOrganizationType ?? initialForm.organizationType,
    fullName: profile?.full_name ?? '',
    contactEmail: session?.user.email ?? '',
    roleDetails: { ...emptyRoleDetails },
  }))
  const [showRegistration, setShowRegistration] = useState(false)
  const [step, setStep] = useState(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cacResult, setCacResult] = useState<CacVerificationResult | null>(null)
  const [isVerifyingCac, setIsVerifyingCac] = useState(false)
  const [cacError, setCacError] = useState<string | null>(null)

  async function handleVerifyCac() {
    const rc = form.registrationNumber.trim()
    if (!rc) { setCacError('Enter a registration number first.'); return }
    setIsVerifyingCac(true)
    setCacError(null)
    try {
      const result = await verifyCacBusiness(rc, form.organizationName)
      setCacResult(result)
      if (result.status === 'not_found') {
        setCacError('No entity found matching this registration number on the CAC registry.')
      } else if (result.status === 'no_match') {
        setCacError(result.message ?? 'Registration found but status is inactive or mismatch.')
      }
    } catch (err) {
      setCacError(err instanceof Error ? err.message : 'CAC verification unavailable.')
    } finally {
      setIsVerifyingCac(false)
    }
  }

  async function handleSignOut() {
    const { error } = await getSupabaseClient().auth.signOut()
    if (error) { setFormError(`Unable to sign out: ${error.message}`); return }
    navigate('/login', { replace: true })
  }

  async function handleNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    if (step === 0) {
      const v = personalInformationSchema.safeParse({ fullName: form.fullName })
      if (!v.success) { setFormError(v.error.issues[0]?.message ?? 'Check your name.'); return }
      try {
        const { error } = await getSupabaseClient()
          .from('profiles')
          .update({ full_name: v.data.fullName })
          .eq('id', session?.user.id ?? '')
        if (error) { setFormError(`Unable to save: ${error.message}`); return }
      } catch (e) {
        setFormError(e instanceof Error ? e.message : 'Unable to save your profile.')
        return
      }
      refreshProfile()
    } else if (step === 1) {
      const v = organizationTypeSchema.safeParse({ organizationType: form.organizationType })
      if (!v.success) { setFormError(v.error.issues[0]?.message ?? 'Choose an organization type.'); return }
    } else if (step === 2) {
      const v = organizationInformationSchema.safeParse(form)
      if (!v.success) { setFormError(v.error.issues[0]?.message ?? 'Check the organization information.'); return }
    } else if (step === 3) {
      const v = validateRoleDetails(form.organizationType, form.roleDetails)
      if (!v.success) { setFormError(v.error.issues[0]?.message ?? 'Check the role-specific information.'); return }
    } else if (step === 4) {
      const v = supportingInformationSchema.safeParse(form)
      if (!v.success) { setFormError(v.error.issues[0]?.message ?? 'Check the supporting information.'); return }
    }
    setStep((s) => Math.min(s + 1, steps.length - 1))
  }

  async function handleSubmit() {
    setFormError(null)
    const v = organizationRegistrationSchema.safeParse(form)
    if (!v.success) { setFormError(v.error.issues[0]?.message ?? 'Check all information.'); return }
    const rv = validateRoleDetails(v.data.organizationType, v.data.roleDetails)
    if (!rv.success) { setFormError(rv.error.issues[0]?.message ?? 'Check role-specific information.'); return }

    const roleInfo = roleDetailsForOrganizationType(v.data.organizationType, v.data.roleDetails)
    const cacNote = cacResult ? formatCacVerificationNote(cacResult) : ''
    const relevantInformation = [v.data.relevantInformation, roleInfo, cacNote].filter(Boolean).join('\n\n')
    if (relevantInformation.length > 5000) { setFormError('Combined organization details must be 5000 characters or fewer.'); return }

    setIsSubmitting(true)
    try {
      const organizationId = await registerOrganization({
        name: v.data.organizationName,
        organizationType: v.data.organizationType,
        registrationNumber: v.data.registrationNumber,
        contactEmail: v.data.contactEmail,
        phone: v.data.phone,
        businessAddress: v.data.businessAddress,
        relevantInformation,
      })
      if (!session) throw new Error('Your session ended. Sign in again.')
      await refreshOrganizations(organizationId)
      setActiveOrganizationId(organizationId)
      setShowRegistration(false)
      setStep(0)
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Registration failed. Try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingOrganizations) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4">
        <LoadingSpinner label="Loading your organizations…" />
      </div>
    )
  }

  const showOrgList = organizations.length > 0 && !showRegistration

  return (
    <div className="min-h-svh bg-background">
      {/* ── Page header ──────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BiotraceMark className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">BIOTRACE</h1>
            <p className="text-xs text-muted-foreground">Organization onboarding</p>
          </div>
        </div>

        {/* Profile email verification notice */}
        {profile?.account_status === 'pending_email_verification' && (
          <div className="mb-4">
            <FormMessage kind="warning">
              Verify {session?.user.email} using the email link before submitting an organization.
            </FormMessage>
          </div>
        )}

        {/* Load error */}
        {loadError && (
          <div className="mb-4 space-y-3">
            <FormMessage kind="error">{loadError}</FormMessage>
            <Button variant="outline" onClick={() => void refreshOrganizations()}>Retry</Button>
          </div>
        )}

        {/* ── Organization list ──────────────────────────── */}
        {!loadError && showOrgList ? (
          <OrganizationList
            organizations={organizations}
            onRegister={() => {
              setFormError(null)
              setCacResult(null)
              setCacError(null)
              setStep(0)
              setForm({
                ...initialForm,
                organizationType: selectedOrganizationType ?? initialForm.organizationType,
                fullName: profile?.full_name ?? '',
                contactEmail: session?.user.email ?? '',
                roleDetails: { ...emptyRoleDetails },
              })
              setShowRegistration(true)
            }}
          />
        ) : !loadError ? (
          /* ── Registration form ─────────────────────────── */
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            {/* Step progress */}
            <div className="mb-6 space-y-3" aria-label="Onboarding progress">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Step {step + 1} of {steps.length}
                </p>
                <p className="text-xs text-muted-foreground">{steps[step]}</p>
              </div>
              <div
                className="flex gap-1"
                role="progressbar"
                aria-valuenow={step + 1}
                aria-valuemin={1}
                aria-valuemax={steps.length}
                aria-label={`Step ${step + 1} of ${steps.length}: ${steps[step]}`}
              >
                {steps.map((label, i) => (
                  <div
                    key={label}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors duration-300',
                      i < step
                        ? 'bg-primary'
                        : i === step
                          ? 'bg-primary/60'
                          : 'bg-muted',
                    )}
                  />
                ))}
              </div>
            </div>

            {formError && (
              <div className="mb-4">
                <FormMessage kind="error">{formError}</FormMessage>
              </div>
            )}

            <form
              className="space-y-5"
              onSubmit={
                step === steps.length - 1
                  ? (e) => { e.preventDefault(); void handleSubmit() }
                  : (e) => void handleNext(e)
              }
            >
              {/* ─ Step 0: Personal information ─ */}
              {step === 0 && (
                <div className="space-y-4">
                  <Field id="onboarding-name" label="Full name">
                    <Input
                      id="onboarding-name"
                      autoComplete="name"
                      required
                      maxLength={150}
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    />
                  </Field>
                  <Field id="onboarding-email" label="Account email" hint="Your email address is set at registration and cannot be changed here.">
                    <Input id="onboarding-email" type="email" value={session?.user.email ?? ''} readOnly className="bg-muted/40 text-muted-foreground" />
                  </Field>
                </div>
              )}

              {/* ─ Step 1: Organization type — visual cards ─ */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Select the type of organization you represent.
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {organizationTypes.map(({ value, label }) => {
                      const Icon = orgTypeIcons[value as OrganizationType] ?? Building2
                      const isSelected = form.organizationType === value
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setForm({ ...form, organizationType: value as OrganizationType })}
                          className={cn(
                            'flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isSelected
                              ? 'border-primary bg-primary/[0.04] font-medium text-foreground'
                              : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                          )}
                          aria-pressed={isSelected}
                        >
                          <span className={cn(
                            'flex size-8 shrink-0 items-center justify-center rounded-md',
                            isSelected ? 'bg-primary/10 text-primary' : 'bg-muted',
                          )}>
                            <Icon className="size-4" aria-hidden />
                          </span>
                          <span className="flex-1">{label}</span>
                          {isSelected && (
                            <CheckCircle2 className="size-4 shrink-0 text-primary" aria-hidden />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ─ Step 2: Organization information ─ */}
              {step === 2 && (
                <div className="space-y-4">
                  <Field id="registration-number" label="Business registration number (RC / BN)">
                    <div className="flex gap-2">
                      <Input
                        id="registration-number"
                        required
                        maxLength={100}
                        placeholder="e.g. RC-123456 or BN-654321"
                        value={form.registrationNumber}
                        onChange={(e) => {
                          setForm({ ...form, registrationNumber: e.target.value })
                          setCacResult(null)
                          setCacError(null)
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isVerifyingCac || !form.registrationNumber.trim()}
                        onClick={() => void handleVerifyCac()}
                        className="shrink-0"
                      >
                        {isVerifyingCac ? 'Verifying…' : 'Verify CAC'}
                      </Button>
                    </div>
                  </Field>

                  {cacError && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)] p-3 text-xs text-[color:var(--status-warning)]">
                      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
                      <div>
                        <p className="font-semibold">CAC verification notice</p>
                        <p className="mt-0.5">{cacError}</p>
                      </div>
                    </div>
                  )}

                  {cacResult?.status === 'match' && (
                    <div className="rounded-lg border border-[color:var(--status-success)] bg-[color:var(--status-success-subtle)] p-3.5 text-xs text-[color:var(--status-success)]">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                        <span className="font-semibold uppercase tracking-wider">
                          CAC record verified {cacResult.isMock ? '(Sandbox)' : ''}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-foreground/80">
                        <p><span className="font-medium">Official legal name:</span> {cacResult.companyName}</p>
                        <p><span className="font-medium">Registration number:</span> {cacResult.registrationNumber}</p>
                        {cacResult.companyType && (
                          <p><span className="font-medium">Classification:</span> {cacResult.companyType}</p>
                        )}
                        {cacResult.companyName && form.organizationName !== cacResult.companyName && (
                          <div className="pt-1">
                            <Button type="button" variant="outline" size="sm" className="h-7 text-xs"
                              onClick={() => setForm({ ...form, organizationName: cacResult.companyName ?? form.organizationName })}>
                              Use official CAC name
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <Field id="organization-name" label="Legal organization name">
                    <Input id="organization-name" required maxLength={200}
                      placeholder="e.g. Lafarge Africa Plc"
                      value={form.organizationName}
                      onChange={(e) => setForm({ ...form, organizationName: e.target.value })} />
                  </Field>
                  <Field id="organization-email" label="Organization contact email">
                    <Input id="organization-email" type="email" required maxLength={254}
                      value={form.contactEmail}
                      onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                  </Field>
                </div>
              )}

              {/* ─ Step 3: Role-specific details ─ */}
              {step === 3 && (
                <RoleDetailsFields
                  organizationType={form.organizationType}
                  details={form.roleDetails}
                  onChange={(key, value) =>
                    setForm({ ...form, roleDetails: { ...form.roleDetails, [key]: value } })
                  }
                />
              )}

              {/* ─ Step 4: Supporting information ─ */}
              {step === 4 && (
                <div className="space-y-4">
                  <Field id="organization-phone" label="Contact phone">
                    <Input id="organization-phone" type="tel" autoComplete="tel"
                      required maxLength={40} value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </Field>
                  <Field id="business-address" label="Business address">
                    <Textarea id="business-address" autoComplete="street-address"
                      required maxLength={500} value={form.businessAddress}
                      onChange={(e) => setForm({ ...form, businessAddress: e.target.value })} />
                  </Field>
                  <Field id="relevant-information" label="Additional organization information (optional)"
                    hint="Include any supporting context not captured in previous steps. Max 5000 characters.">
                    <Textarea id="relevant-information" maxLength={5000}
                      value={form.relevantInformation}
                      onChange={(e) => setForm({ ...form, relevantInformation: e.target.value })} />
                  </Field>
                </div>
              )}

              {/* ─ Step 5: Review and submit ─ */}
              {step === 5 && (
                <div className="space-y-5">
                  <dl className="space-y-2.5">
                    <Summary label="Full name" value={form.fullName} />
                    <Summary label="Account email" value={session?.user.email ?? ''} />
                    <Summary label="Organization type" value={organizationTypeLabel(form.organizationType)} />
                    <Summary label="Legal name" value={form.organizationName} />
                    <Summary label="Registration number" value={form.registrationNumber} />
                    <Summary
                      label="CAC verification"
                      value={
                        cacResult
                          ? `${cacResult.status.toUpperCase()} · ${cacResult.registrationNumber}${cacResult.isMock ? ' (Sandbox)' : ' (Official Registry)'}`
                          : 'Not pre-verified — administrator will verify during review'
                      }
                    />
                    <Summary label="Contact email" value={form.contactEmail} />
                    <Summary label="Phone" value={form.phone} />
                    <Summary label="Business address" value={form.businessAddress} />
                    <Summary label="Additional information" value={form.relevantInformation || 'Not provided'} />
                    <Summary
                      label="Role-specific details"
                      value={roleDetailsForOrganizationType(form.organizationType, form.roleDetails) || 'Not provided'}
                    />
                  </dl>

                  <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground space-y-1.5">
                    <p>
                      Role-specific information is applicant-provided and is not independently verified.
                      File uploads are not available in this onboarding phase.
                    </p>
                    <p>
                      Submitting creates an organization owner membership and queues the organization
                      for verification. It does not grant administrator privileges or bypass review.
                    </p>
                  </div>
                </div>
              )}

              {/* ─ Navigation buttons ─ */}
              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
                {step > 0 ? (
                  <Button type="button" variant="outline"
                    onClick={() => { setFormError(null); setStep((s) => s - 1) }}>
                    <ChevronLeft aria-hidden /> Back
                  </Button>
                ) : (
                  <Button type="button" variant="outline" onClick={() => void handleSignOut()}>
                    <LogOut aria-hidden /> Sign out
                  </Button>
                )}
                {step < steps.length - 1 ? (
                  <Button type="submit">
                    Continue <ChevronRight aria-hidden />
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting}>
                    <Check aria-hidden />
                    {isSubmitting ? 'Submitting…' : 'Submit for verification'}
                  </Button>
                )}
              </div>
            </form>
          </div>
        ) : null}

        {/* Footer links */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/signup" className="hover:text-primary hover:underline">Register a different organization</Link>
          {' · '}
          <Link to="/login" className="hover:text-primary hover:underline">Sign in to a different account</Link>
        </div>
      </div>
    </div>
  )
}
