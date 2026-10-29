import { seedDeliveries } from '@/data/seed-deliveries'
import type { Delivery, ReviewDecision, UserRole } from '@/types'
import { isSupabaseConfigured } from '@/lib/supabase'

export type DataMode = 'demo' | 'supabase'

const requestedMode = (import.meta.env.VITE_DATA_MODE ?? '').toLowerCase()

export const DATA_MODE: DataMode =
  requestedMode === 'supabase' && isSupabaseConfigured ? 'supabase' : 'demo'

export function isDemoMode(): boolean {
  return DATA_MODE === 'demo'
}

export async function listDeliveriesForRole(_role: UserRole): Promise<Delivery[]> {
  return [...seedDeliveries]
}

export async function getDeliveryById(_deliveryId: string): Promise<Delivery | undefined> {
  return seedDeliveries.find((delivery) => delivery.id === _deliveryId)
}

export async function listReviewsForDelivery(_deliveryId: string): Promise<ReviewDecision[]> {
  const delivery = seedDeliveries.find((item) => item.id === _deliveryId)
  return delivery?.reviews ?? []
}

export function formatDataAccessStatus(): string {
  if (DATA_MODE === 'supabase') {
    return 'Supabase is configured in the environment. The app is ready to switch to live persistence once a project target is selected and verified.'
  }

  return 'Demo mode active: using seed records and local in-memory state. Supabase persistence is prepared but not connected.'
}
