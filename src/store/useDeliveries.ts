import { useEffect, useSyncExternalStore } from 'react'
import {
  subscribe,
  getDeliveries,
  syncDeliveriesFromSupabase,
} from '@/store/deliveries'
import { DATA_MODE } from '@/lib/data-access'
import type { Delivery } from '@/types'

export function useDeliveries(): Delivery[] {
  useEffect(() => {
    if (DATA_MODE === 'supabase') {
      void syncDeliveriesFromSupabase()
    }
  }, [])

  return useSyncExternalStore(subscribe, getDeliveries, getDeliveries)
}

export function useDelivery(id: string): Delivery | undefined {
  const deliveries = useDeliveries()
  return deliveries.find((d) => d.id === id)
}
