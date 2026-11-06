/**
 * In-memory delivery store.
 * Persists across route navigations via module-level state.
 * Will be replaced by Supabase in Milestone 4.
 */
import type {
  Delivery,
  DeliveryStatus,
  EvidenceFile,
  ReviewDecision,
  ReviewDecisionType,
  UserRole,
} from '@/types'
import { seedDeliveries, demoUsers } from '@/data/seed-deliveries'
import { createId, nextDeliveryReference } from '@/lib/delivery-ids'
import { DATA_MODE } from '@/lib/data-access'
import { listDeliveriesFromSupabase } from '@/lib/deliveries-supabase'

type Listener = () => void

let _deliveries: Delivery[] = DATA_MODE === 'supabase' ? [] : [...seedDeliveries]
const _listeners = new Set<Listener>()

function notify() {
  _listeners.forEach((fn) => fn())
}

export function subscribe(fn: Listener): () => void {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

export function getDeliveries(): Delivery[] {
  return _deliveries
}

export function getDelivery(id: string): Delivery | undefined {
  return _deliveries.find((d) => d.id === id)
}

export async function syncDeliveriesFromSupabase(): Promise<Delivery[]> {
  if (DATA_MODE !== 'supabase') return _deliveries
  try {
    const remote = await listDeliveriesFromSupabase()
    _deliveries = remote
    notify()
    return remote
  } catch (err) {
    console.warn('Failed to sync deliveries from Supabase:', err)
    return _deliveries
  }
}

export function addDelivery(
  input: Omit<
    Delivery,
    | 'id'
    | 'reference'
    | 'status'
    | 'measuredQuantityT'
    | 'discrepancyNote'
    | 'history'
    | 'reviews'
    | 'createdAt'
    | 'updatedAt'
  >,
): Delivery {
  const now = new Date().toISOString()
  const refs = _deliveries.map((d) => d.reference)
  const delivery: Delivery = {
    ...input,
    id: createId('del'),
    reference: nextDeliveryReference(refs),
    status: 'pending_plant_confirmation',
    measuredQuantityT: null,
    discrepancyNote: '',
    history: [
      {
        id: createId('hist'),
        fromStatus: null,
        toStatus: 'pending_plant_confirmation',
        actorName: demoUsers.find((u) => u.role === 'supplier')?.name ?? 'Supplier',
        actorRole: 'supplier',
        note: `Delivery submitted with declared weight ${input.declaredQuantityT} t.`,
        timestamp: now,
      },
    ],
    reviews: [],
    createdAt: now,
    updatedAt: now,
  }
  _deliveries = [delivery, ..._deliveries]
  notify()
  return delivery
}

export function updateDeliveryStatus(
  id: string,
  toStatus: DeliveryStatus,
  actorName: string,
  actorRole: UserRole,
  note: string,
  extra?: Partial<Pick<Delivery, 'measuredQuantityT' | 'discrepancyNote' | 'evidence'>>,
): Delivery {
  const now = new Date().toISOString()
  _deliveries = _deliveries.map((d) => {
    if (d.id !== id) return d
    return {
      ...d,
      ...extra,
      status: toStatus,
      updatedAt: now,
      history: [
        ...d.history,
        {
          id: createId('hist'),
          fromStatus: d.status,
          toStatus,
          actorName,
          actorRole,
          note,
          timestamp: now,
        },
      ],
    }
  })
  notify()
  return _deliveries.find((d) => d.id === id)!
}

/**
 * Record a review decision against a delivery.
 *
 * Allowed transitions:
 *   awaiting_review | corrections_requested → reviewed (approved)
 *   awaiting_review | corrections_requested → corrections_requested
 *   awaiting_review | corrections_requested → rejected
 *
 * The reviewer identity is passed explicitly — in a real system this would
 * come from the authenticated session and be verified server-side.
 */
export function recordReview(
  deliveryId: string,
  reviewerName: string,
  reviewerRole: UserRole,
  decision: ReviewDecisionType,
  note: string,
): Delivery {
  const delivery = _deliveries.find((d) => d.id === deliveryId)
  if (!delivery) throw new Error(`Delivery ${deliveryId} not found`)

  const allowedStatuses: DeliveryStatus[] = ['awaiting_review', 'corrections_requested']
  if (!allowedStatuses.includes(delivery.status)) {
    throw new Error(
      `Cannot review a delivery with status "${delivery.status}". ` +
        `Only deliveries awaiting review or corrections can be reviewed.`,
    )
  }

  const toStatus: DeliveryStatus =
    decision === 'approved'
      ? 'reviewed'
      : decision === 'corrections_requested'
        ? 'corrections_requested'
        : 'rejected'

  const now = new Date().toISOString()
  const reviewRecord: ReviewDecision = {
    id: createId('rev'),
    deliveryId,
    reviewerName,
    reviewerRole,
    decision,
    note,
    timestamp: now,
  }

  _deliveries = _deliveries.map((d) => {
    if (d.id !== deliveryId) return d
    return {
      ...d,
      status: toStatus,
      updatedAt: now,
      reviews: [...d.reviews, reviewRecord],
      history: [
        ...d.history,
        {
          id: createId('hist'),
          fromStatus: d.status,
          toStatus,
          actorName: reviewerName,
          actorRole: reviewerRole,
          note,
          timestamp: now,
        },
      ],
    }
  })
  notify()
  return _deliveries.find((d) => d.id === deliveryId)!
}

export function addEvidenceToDelivery(id: string, files: EvidenceFile[]): void {
  _deliveries = _deliveries.map((d) => {
    if (d.id !== id) return d
    return {
      ...d,
      evidence: [...d.evidence, ...files],
      updatedAt: new Date().toISOString(),
    }
  })
  notify()
}
