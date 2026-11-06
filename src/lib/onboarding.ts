import { z } from 'zod'

export const primaryOrganizationTypes = [
  { value: 'cement_plant', label: 'Cement plant' },
  { value: 'independent_reviewer', label: 'Auditor' },
  { value: 'supplier', label: 'Biomass supplier' },
] as const

export const organizationTypes = [
  { value: 'supplier', label: 'Biomass supplier' },
  { value: 'biomass_aggregator', label: 'Biomass aggregator' },
  { value: 'cement_plant', label: 'Cement plant' },
  { value: 'independent_reviewer', label: 'Independent reviewer' },
  { value: 'carbon_buyer', label: 'Carbon buyer' },
] as const

export const organizationTypeValues = organizationTypes.map(({ value }) => value) as [
  (typeof organizationTypes)[number]['value'],
  ...(typeof organizationTypes)[number]['value'][],
]

export const signupRolePaths = {
  cement_plant: 'cement-plant',
  independent_reviewer: 'auditor',
  supplier: 'supplier',
  biomass_aggregator: 'other?type=biomass_aggregator',
  carbon_buyer: 'other?type=carbon_buyer',
} satisfies Record<OrganizationType, string>

export function organizationTypeFromSignupPath(path: string | null): OrganizationType | null {
  switch (path) {
    case 'cement-plant':
      return 'cement_plant'
    case 'auditor':
      return 'independent_reviewer'
    case 'supplier':
      return 'supplier'
    default:
      return null
  }
}

export function organizationTypeFromValue(value: unknown): OrganizationType | null {
  if (typeof value !== 'string') return null
  return organizationTypes.find((option) => option.value === value)?.value ?? null
}

export const personalInformationSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(150),
})

export const organizationTypeSchema = z.object({
  organizationType: z.enum(organizationTypeValues, {
    required_error: 'Choose an organization type.',
  }),
})

export const organizationInformationSchema = z.object({
  organizationName: z.string().trim().min(2, 'Enter the legal organization name.').max(200),
  registrationNumber: z.string().trim().min(2, 'Enter the registration number.').max(100),
  contactEmail: z.string().trim().email('Enter a valid contact email.'),
})

export const supportingInformationSchema = z.object({
  phone: z.string().trim().min(7, 'Enter a valid contact phone number.').max(40),
  businessAddress: z.string().trim().min(5, 'Enter the business address.').max(500),
  relevantInformation: z.string().trim().max(5000, 'Use 5000 characters or fewer.'),
})

const optionalDetail = (max: number) => z.string().trim().max(max)

export const roleDetailsSchema = z.object({
  facilityName: optionalDetail(200),
  facilityLocation: optionalDetail(500),
  authorizedRepresentative: optionalDetail(200),
  operationalPermits: optionalDetail(2000),
  accreditationBody: optionalDetail(200),
  accreditationNumber: optionalDetail(200),
  accreditationScope: optionalDetail(1000),
  standardsAffiliation: optionalDetail(500),
  registryReference: optionalDetail(500),
  auditorQualifications: optionalDetail(2000),
  conflictOfInterestDeclared: z.boolean(),
  businessType: optionalDetail(200),
  biomassCategories: optionalDetail(1000),
  sourcingLocations: optionalDetail(1000),
  supplyCapacity: optionalDetail(300),
  sourceDocumentation: optionalDetail(1000),
  sustainabilityEvidence: optionalDetail(1000),
})

export const emptyRoleDetails: z.infer<typeof roleDetailsSchema> = {
  facilityName: '',
  facilityLocation: '',
  authorizedRepresentative: '',
  operationalPermits: '',
  accreditationBody: '',
  accreditationNumber: '',
  accreditationScope: '',
  standardsAffiliation: '',
  registryReference: '',
  auditorQualifications: '',
  conflictOfInterestDeclared: false,
  businessType: '',
  biomassCategories: '',
  sourcingLocations: '',
  supplyCapacity: '',
  sourceDocumentation: '',
  sustainabilityEvidence: '',
}

export const cementPlantDetailsSchema = z.object({
  facilityName: z.string().trim().min(2, 'Enter the facility name.').max(200),
  facilityLocation: z.string().trim().min(5, 'Enter the facility location.').max(500),
  authorizedRepresentative: z.string().trim().min(2, 'Enter the authorized representative.').max(200),
  operationalPermits: z.string().trim().min(2, 'List relevant operational or environmental permits.').max(2000),
})

export const auditorDetailsSchema = z.object({
  accreditationBody: z.string().trim().min(2, 'Enter the accreditation body.').max(200),
  accreditationNumber: z.string().trim().min(2, 'Enter the certificate or accreditation number.').max(200),
  accreditationScope: z.string().trim().min(2, 'Describe the accreditation scope.').max(1000),
  standardsAffiliation: z.string().trim().min(2, 'Describe any Verra or Gold Standard VVB affiliation, or enter “Not applicable”.').max(500),
  registryReference: z.string().trim().min(2, 'Enter an official registry reference, or explain that none is available.').max(500),
  auditorQualifications: z.string().trim().min(2, 'Summarize auditor qualifications and credentials.').max(2000),
  conflictOfInterestDeclared: z.literal(true, {
    errorMap: () => ({ message: 'Acknowledge the conflict-of-interest declaration.' }),
  }),
})

export const supplierDetailsSchema = z.object({
  businessType: z.string().trim().min(2, 'Describe the supplier business type.').max(200),
  biomassCategories: z.string().trim().min(2, 'List the biomass categories supplied.').max(1000),
  sourcingLocations: z.string().trim().min(2, 'List biomass sourcing locations.').max(1000),
  supplyCapacity: z.string().trim().min(2, 'Describe estimated supply capacity and units.').max(300),
  sourceDocumentation: z.string().trim().min(2, 'Describe available source documentation.').max(1000),
  sustainabilityEvidence: z.string().trim().min(2, 'Describe sustainability evidence, or state “Not available”.').max(1000),
})

export const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name.').max(150),
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(10, 'Use at least 10 characters.'),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
})

export type OrganizationType = (typeof organizationTypes)[number]['value']
export const organizationRegistrationSchema = personalInformationSchema
  .merge(organizationTypeSchema)
  .merge(organizationInformationSchema)
  .merge(supportingInformationSchema)
  .extend({ roleDetails: roleDetailsSchema })

export type OrganizationRegistration = z.infer<typeof organizationRegistrationSchema>
export type OrganizationRoleDetails = z.infer<typeof roleDetailsSchema>

export function roleDetailsForOrganizationType(
  organizationType: OrganizationType,
  details: OrganizationRoleDetails,
): string {
  let entries: Array<[string, string]>
  switch (organizationType) {
    case 'cement_plant':
      entries = [
        ['Facility name', details.facilityName],
        ['Facility location', details.facilityLocation],
        ['Authorized representative', details.authorizedRepresentative],
        ['Operational/environmental permits', details.operationalPermits],
      ]
      break
    case 'independent_reviewer':
      entries = [
        ['Accreditation body', details.accreditationBody],
        ['Accreditation number', details.accreditationNumber],
        ['Accreditation scope', details.accreditationScope],
        ['Standards affiliation', details.standardsAffiliation],
        ['Official registry reference', details.registryReference],
        ['Auditor qualifications', details.auditorQualifications],
        [
          'Conflict-of-interest declaration',
          details.conflictOfInterestDeclared ? 'Acknowledged' : '',
        ],
      ]
      break
    case 'supplier':
      entries = [
        ['Supplier business type', details.businessType],
        ['Biomass categories', details.biomassCategories],
        ['Sourcing locations', details.sourcingLocations],
        ['Estimated supply capacity', details.supplyCapacity],
        ['Source documentation', details.sourceDocumentation],
        ['Sustainability evidence', details.sustainabilityEvidence],
      ]
      break
    default:
      entries = []
  }

  const provided = entries.filter(([, value]) => value.trim() !== '')
  if (provided.length === 0) return ''

  return [
    'Applicant-provided onboarding details (not independently verified):',
    ...provided.map(([label, value]) => `${label}: ${value.trim()}`),
  ].join('\n')
}

export function validateRoleDetails(
  organizationType: OrganizationType,
  details: OrganizationRoleDetails,
) {
  switch (organizationType) {
    case 'cement_plant':
      return cementPlantDetailsSchema.safeParse(details)
    case 'independent_reviewer':
      return auditorDetailsSchema.safeParse(details)
    case 'supplier':
      return supplierDetailsSchema.safeParse(details)
    default:
      return roleDetailsSchema.safeParse(details)
  }
}

export function organizationTypeLabel(value: string): string {
  return organizationTypes.find((option) => option.value === value)?.label ?? value
}

export function verificationStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Submitted'
    case 'under_review':
      return 'Under review'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'additional_information_required':
      return 'Additional information required'
    default:
      return 'Status unavailable'
  }
}
