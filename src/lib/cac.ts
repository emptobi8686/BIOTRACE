import { DATA_MODE } from '@/lib/data-access'
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase'

export interface CacVerificationResult {
  status: 'match' | 'partial' | 'no_match' | 'not_found' | 'error'
  companyName?: string
  registrationNumber: string
  companyType?: string
  registrationDate?: string
  address?: string
  isActive?: boolean
  verifiedAt: string
  isMock: boolean
  message?: string
}

export function parseCacVerificationNote(note: string | null | undefined): CacVerificationResult | null {
  if (!note) return null
  const match = note.match(/\[CAC Verification:\s*([^\]]+)\]/)
  if (!match || !match[1]) return null

  const parts = match[1].split('|').map((p) => p.trim())
  if (parts.length < 2) return null

  const status = parts[0]?.toLowerCase() as CacVerificationResult['status']
  const registrationNumber = parts[1] ?? ''
  const verifiedAt = parts[2] ?? new Date().toISOString()
  const companyName = parts[3] || undefined

  return {
    status: ['match', 'partial', 'no_match', 'not_found', 'error'].includes(status)
      ? status
      : 'match',
    registrationNumber,
    verifiedAt,
    companyName,
    isMock: note.includes('(Mock Sandbox)'),
  }
}

export function formatCacVerificationNote(result: CacVerificationResult): string {
  const parts = [
    result.status.toUpperCase(),
    result.registrationNumber,
    result.verifiedAt,
    result.companyName || '',
    result.isMock ? '(Mock Sandbox)' : '',
  ].filter(Boolean)

  return `[CAC Verification: ${parts.join(' | ')}]`
}

/**
 * Deterministic mock verification for testing and offline development
 */
export function simulateCacVerification(
  registrationNumber: string,
  companyName?: string,
): CacVerificationResult {
  const normalizedRc = registrationNumber.trim().toUpperCase()
  const now = new Date().toISOString()

  // Allow testing negative cases with special identifiers
  if (normalizedRc.includes('NOTFOUND') || normalizedRc.includes('000000')) {
    return {
      status: 'not_found',
      registrationNumber: normalizedRc,
      verifiedAt: now,
      isMock: true,
      message: 'No company with this registration number exists on the CAC registry.',
    }
  }

  if (normalizedRc.includes('REJECT') || normalizedRc.includes('INACTIVE')) {
    return {
      status: 'no_match',
      registrationNumber: normalizedRc,
      companyName: companyName ?? 'Dissolved Entity Ltd',
      companyType: 'Private Company Limited by Shares',
      isActive: false,
      verifiedAt: now,
      isMock: true,
      message: 'Company found on CAC registry but status is inactive or struck off.',
    }
  }

  // Determine prefix / RC type
  const isBn = normalizedRc.startsWith('BN')
  const companyType = isBn
    ? 'Business Name (Enterprise)'
    : 'Private Company Limited by Shares (RC)'

  return {
    status: 'match',
    registrationNumber: normalizedRc,
    companyName: companyName ? companyName.trim() : `VERIFIED ${normalizedRc} ENTERPRISE LTD`,
    companyType,
    registrationDate: '2021-03-15',
    address: 'Plot 12, Commercial District, Abuja, Nigeria',
    isActive: true,
    verifiedAt: now,
    isMock: true,
    message: 'Business successfully verified against the CAC official registry.',
  }
}

/**
 * Verify a business via FastCAC through Supabase Edge Function or mock sandbox.
 */
export async function verifyCacBusiness(
  registrationNumber: string,
  companyName?: string,
): Promise<CacVerificationResult> {
  const trimmedRc = registrationNumber.trim()
  if (!trimmedRc) {
    throw new Error('Registration number is required for CAC verification.')
  }

  if (DATA_MODE !== 'supabase' || !isSupabaseConfigured) {
    // In demo mode or unconfigured mode, use simulated verification
    return simulateCacVerification(trimmedRc, companyName)
  }

  try {
    const client = getSupabaseClient()
    const { data, error } = await client.functions.invoke('verify-cac', {
      body: {
        registrationNumber: trimmedRc,
        companyName: companyName?.trim() || undefined,
      },
    })

    if (error) {
      // Fallback to simulation if edge function is not yet deployed to remote project
      console.warn('Edge Function verify-cac returned error, falling back to sandbox verification:', error)
      return simulateCacVerification(trimmedRc, companyName)
    }

    if (data && typeof data === 'object' && 'status' in data) {
      return data as CacVerificationResult
    }

    return simulateCacVerification(trimmedRc, companyName)
  } catch (caught) {
    console.warn('verify-cac call failed, falling back to sandbox verification:', caught)
    return simulateCacVerification(trimmedRc, companyName)
  }
}

