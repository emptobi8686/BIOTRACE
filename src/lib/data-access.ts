import { seedDeliveries } from '@/data/seed-deliveries'
import type { Delivery, ReviewDecision, UserRole } from '@/types'
import { isSupabaseConfigured, supabaseConfig } from '@/lib/supabase'

export type DataMode = 'demo' | 'supabase' | 'configuration-error'

const requestedMode = import.meta.env.VITE_DATA_MODE ?? ''

export function resolveDataMode(
  mode: string,
  supabaseConfigured: boolean,
  isProduction = import.meta.env.PROD,
): DataMode {
  const normalizedMode = mode.trim().toLowerCase()

  if (normalizedMode === 'demo') {
    return isProduction ? 'configuration-error' : 'demo'
  }
  if (normalizedMode === 'supabase') {
    return supabaseConfigured ? 'supabase' : 'configuration-error'
  }
  if (normalizedMode !== '') return 'configuration-error'

  return supabaseConfigured ? 'supabase' : 'configuration-error'
}

export const DATA_MODE = resolveDataMode(
  requestedMode,
  isSupabaseConfigured,
)

function assertDemoMode(): void {
  if (DATA_MODE !== 'demo') {
    throw new Error(formatDataAccessStatus())
  }
}

export function isDemoMode(): boolean {
  return DATA_MODE === 'demo'
}

export async function listDeliveriesForRole(_role: UserRole): Promise<Delivery[]> {
  assertDemoMode()
  return [...seedDeliveries]
}

export async function getDeliveryById(_deliveryId: string): Promise<Delivery | undefined> {
  assertDemoMode()
  return seedDeliveries.find((delivery) => delivery.id === _deliveryId)
}

export async function listReviewsForDelivery(_deliveryId: string): Promise<ReviewDecision[]> {
  assertDemoMode()
  const delivery = seedDeliveries.find((item) => item.id === _deliveryId)
  return delivery?.reviews ?? []
}

export function formatDataAccessStatus(): string {
  if (DATA_MODE === 'configuration-error') {
    const normalizedMode = requestedMode.trim().toLowerCase()
    if (normalizedMode === 'demo' && import.meta.env.PROD) {
      return 'Demo mode is disabled in production. Set VITE_DATA_MODE=supabase.'
    }

    if (normalizedMode && !['demo', 'supabase'].includes(normalizedMode)) {
      return 'Invalid VITE_DATA_MODE. Set it to "demo" or "supabase".'
    }

    return (
      `${supabaseConfig.configurationError ?? 'Supabase is not configured.'} ` +
      'For intentional local demo use, explicitly set VITE_DATA_MODE=demo.'
    )
  }

  if (DATA_MODE === 'supabase') {
    return 'Supabase is configured, but persistent application data access is not implemented yet. Demo records are disabled in this mode.'
  }

  return 'Explicit demo mode active: using seeded records and local in-memory state. Do not use demo mode for production data.'
}
