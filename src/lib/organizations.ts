import { getSupabaseClient } from '@/lib/supabase'
import type { OrganizationType } from '@/lib/onboarding'

export interface OrganizationRegistrationInput {
  name: string
  organizationType: OrganizationType
  registrationNumber: string
  contactEmail: string
  phone: string
  businessAddress: string
  relevantInformation: string
}

export interface OnboardingOrganization {
  id: string
  name: string
  organizationType: string
  membershipRole: string
  verificationStatus: string | null
  submittedAt: string | null
  decisionReason: string | null
}

function registrationError(error: { code?: string; message: string }): Error {
  if (error.code === '23505') {
    if (
      error.message.includes('registration number') ||
      error.message.includes('organizations_registration_number_unique')
    ) {
      return new Error('An organization with this registration number already exists.')
    }
    return new Error('An organization with this legal name already exists.')
  }
  if (error.code === '42501') {
    return new Error(error.message)
  }
  if (error.code === '22023') {
    return new Error(error.message)
  }
  return new Error('Organization registration failed. Please try again.')
}

export async function registerOrganization(
  input: OrganizationRegistrationInput,
): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('register_organization', {
    p_name: input.name,
    p_organization_type: input.organizationType,
    p_registration_number: input.registrationNumber,
    p_contact_email: input.contactEmail,
    p_phone: input.phone,
    p_business_address: input.businessAddress,
    p_relevant_information: input.relevantInformation || null,
  })

  if (error) throw registrationError(error)
  if (!data) throw new Error('Organization registration returned no organization ID.')
  return data
}

export async function addOrganizationMember(
  organizationId: string,
  userId: string,
  role: 'member' | 'supplier' | 'aggregator' | 'plant_operator' | 'reviewer' | 'buyer',
): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('add_organization_member', {
    p_organization_id: organizationId,
    p_user_id: userId,
    p_role: role,
  })
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Membership creation returned no membership ID.')
  return data
}

export async function getMyOrganizations(userId: string): Promise<OnboardingOrganization[]> {
  const client = getSupabaseClient()
  const { data: memberships, error: membershipsError } = await client
    .from('organization_memberships')
    .select('organization_id, role, is_active, created_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (membershipsError) throw new Error('Unable to load your organization memberships.')
  if (!memberships?.length) return []

  const organizationIds = memberships.map((membership) => membership.organization_id)
  const [organizationsResult, verificationsResult] = await Promise.all([
    client
      .from('organizations')
      .select('id, name, organization_type')
      .in('id', organizationIds),
    client
      .from('organization_verifications')
      .select('organization_id, status, submitted_at, decision_reason')
      .in('organization_id', organizationIds)
      .order('submitted_at', { ascending: false }),
  ])

  if (organizationsResult.error) {
    throw new Error('Unable to load your organization details.')
  }
  if (verificationsResult.error) {
    throw new Error('Unable to load organization verification status.')
  }

  const organizations = new Map(
    (organizationsResult.data ?? []).map((organization) => [organization.id, organization]),
  )
  const latestVerifications = new Map<
    string,
    NonNullable<typeof verificationsResult.data>[number]
  >()
  for (const verification of verificationsResult.data ?? []) {
    if (!latestVerifications.has(verification.organization_id)) {
      latestVerifications.set(verification.organization_id, verification)
    }
  }

  return memberships.flatMap((membership) => {
    const organization = organizations.get(membership.organization_id)
    if (!organization) return []
    const verification = latestVerifications.get(membership.organization_id)
    return [{
      id: organization.id,
      name: organization.name,
      organizationType: organization.organization_type,
      membershipRole: membership.role,
      verificationStatus: verification?.status ?? null,
      submittedAt: verification?.submitted_at ?? null,
      decisionReason: verification?.decision_reason ?? null,
    }]
  })
}
