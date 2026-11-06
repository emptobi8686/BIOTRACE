import { describe, expect, it } from 'vitest'
import {
  auditorDetailsSchema,
  cementPlantDetailsSchema,
  emptyRoleDetails,
  organizationRegistrationSchema,
  organizationTypeLabel,
  roleDetailsForOrganizationType,
  signupSchema,
  supplierDetailsSchema,
  validateRoleDetails,
  verificationStatusLabel,
} from './onboarding'

const validRegistration = {
  fullName: 'Ada Example',
  organizationType: 'supplier',
  organizationName: 'Example Biomass Limited',
  registrationNumber: 'RC-12345',
  contactEmail: 'contact@example.test',
  phone: '+234 800 123 4567',
  businessAddress: '12 Climate Road, Lagos',
  relevantInformation: 'Biomass sourcing and processing.',
  roleDetails: emptyRoleDetails,
}

describe('onboarding validation', () => {
  it('accepts a complete organization registration for every supported type', () => {
    for (const organizationType of [
      'supplier',
      'biomass_aggregator',
      'cement_plant',
      'independent_reviewer',
      'carbon_buyer',
    ]) {
      expect(
        organizationRegistrationSchema.safeParse({
          ...validRegistration,
          organizationType,
        }).success,
      ).toBe(true)
    }
  })

  it('rejects invalid email, missing legal registration details, and oversized text', () => {
    expect(
      organizationRegistrationSchema.safeParse({
        ...validRegistration,
        contactEmail: 'not-an-email',
      }).success,
    ).toBe(false)
    expect(
      organizationRegistrationSchema.safeParse({
        ...validRegistration,
        registrationNumber: ' ',
      }).success,
    ).toBe(false)
    expect(
      organizationRegistrationSchema.safeParse({
        ...validRegistration,
        relevantInformation: 'x'.repeat(5001),
      }).success,
    ).toBe(false)
  })

  it('requires a long password and matching confirmation', () => {
    expect(
      signupSchema.safeParse({
        fullName: 'Ada Example',
        email: 'ada@example.test',
        password: 'short',
        confirmPassword: 'short',
      }).success,
    ).toBe(false)
    expect(
      signupSchema.safeParse({
        fullName: 'Ada Example',
        email: 'ada@example.test',
        password: 'LongEnough1',
        confirmPassword: 'DifferentPassword',
      }).success,
    ).toBe(false)
  })

  it('validates role-specific applicant information without treating it as verified', () => {
    const supplierDetails = {
      ...emptyRoleDetails,
      businessType: 'Biomass processor',
      biomassCategories: 'Wood waste',
      sourcingLocations: 'Ogun State',
      supplyCapacity: '500 tonnes per month',
      sourceDocumentation: 'Supplier invoices',
      sustainabilityEvidence: 'Not available',
    }
    expect(supplierDetailsSchema.safeParse(supplierDetails).success).toBe(true)
    expect(validateRoleDetails('supplier', supplierDetails).success).toBe(true)
    expect(
      roleDetailsForOrganizationType('supplier', supplierDetails),
    ).toContain('not independently verified')

    expect(cementPlantDetailsSchema.safeParse(emptyRoleDetails).success).toBe(false)
    expect(auditorDetailsSchema.safeParse(emptyRoleDetails).success).toBe(false)
    expect(
      validateRoleDetails('independent_reviewer', {
        ...emptyRoleDetails,
        accreditationBody: 'Accreditation body',
        accreditationNumber: 'CERT-1',
        accreditationScope: 'GHG verification',
        standardsAffiliation: 'Not applicable',
        registryReference: 'No registry reference available',
        auditorQualifications: 'Qualified audit team',
        conflictOfInterestDeclared: true,
      }).success,
    ).toBe(true)
  })

  it('provides safe labels for known and unknown statuses', () => {
    expect(organizationTypeLabel('cement_plant')).toBe('Cement plant')
    expect(verificationStatusLabel('under_review')).toBe('Under review')
    expect(verificationStatusLabel('unexpected')).toBe('Status unavailable')
  })
})
