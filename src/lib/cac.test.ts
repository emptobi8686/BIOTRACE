import { describe, expect, it } from 'vitest'
import {
  formatCacVerificationNote,
  parseCacVerificationNote,
  simulateCacVerification,
  verifyCacBusiness,
} from './cac'

describe('CAC Verification Service', () => {
  it('formats and parses CAC verification notes accurately', () => {
    const original = {
      status: 'match' as const,
      registrationNumber: 'RC-123456',
      verifiedAt: '2026-11-04T12:00:00Z',
      companyName: 'Lafarge Africa Plc',
      isMock: false,
    }

    const note = formatCacVerificationNote(original)
    expect(note).toContain('[CAC Verification: MATCH | RC-123456 | 2026-11-04T12:00:00Z | Lafarge Africa Plc]')

    const parsed = parseCacVerificationNote(note)
    expect(parsed).not.toBeNull()
    expect(parsed?.status).toBe('match')
    expect(parsed?.registrationNumber).toBe('RC-123456')
    expect(parsed?.companyName).toBe('Lafarge Africa Plc')
    expect(parsed?.isMock).toBe(false)
  })

  it('marks mock notes as mock in parseCacVerificationNote', () => {
    const mockNote = '[CAC Verification: MATCH | RC-999 | 2026-11-04T12:00:00Z | Test Corp | (Mock Sandbox)]'
    const parsed = parseCacVerificationNote(mockNote)
    expect(parsed?.isMock).toBe(true)
  })

  it('returns null when parsing invalid or empty notes', () => {
    expect(parseCacVerificationNote(null)).toBeNull()
    expect(parseCacVerificationNote('')).toBeNull()
    expect(parseCacVerificationNote('Just some regular note')).toBeNull()
  })

  it('simulates verified business for standard RC numbers', () => {
    const result = simulateCacVerification('RC-1029384', 'Dangote Cement')
    expect(result.status).toBe('match')
    expect(result.isActive).toBe(true)
    expect(result.companyName).toBe('Dangote Cement')
    expect(result.companyType).toContain('Private Company')
  })

  it('simulates not_found for test NOTFOUND numbers', () => {
    const result = simulateCacVerification('RC-NOTFOUND-01')
    expect(result.status).toBe('not_found')
    expect(result.message).toContain('No company with this registration number exists')
  })

  it('simulates inactive/no_match for REJECT numbers', () => {
    const result = simulateCacVerification('RC-REJECT-99')
    expect(result.status).toBe('no_match')
    expect(result.isActive).toBe(false)
  })

  it('calls verifyCacBusiness and returns valid verification', async () => {
    const result = await verifyCacBusiness('RC-555123', 'BioTrace Energy')
    expect(result.status).toBe('match')
    expect(result.registrationNumber).toBe('RC-555123')
  })

  it('throws error when registration number is empty', async () => {
    await expect(verifyCacBusiness('')).rejects.toThrow('Registration number is required')
  })
})

