import { useSyncExternalStore } from 'react'
import {
  subscribe,
  getDeliveries,
} from '@/store/deliveries'
import type { Delivery } from '@/types'

export function useDeliveries(): Delivery[] {
  return useSyncExternalStore(subscribe, getDeliveries, getDeliveries)
}

export function useDelivery(id: string): Delivery | undefined {
  const deliveries = useDeliveries()
  // useSyncExternalStore already triggers re-render, just find from snapshot
  return deliveries.find((d) => d.id === id)
}
