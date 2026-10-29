import type { DeliveryStatus, ImpactLabel, UserRole } from '@/types'

export function roleLabel(role: UserRole): string {
  const map: Record<UserRole, string> = {
    administrator: 'Administrator',
    supplier: 'Biomass supplier',
    plant_operator: 'Cement plant operator',
    reviewer: 'Independent reviewer',
    buyer: 'Carbon buyer',
  }
  return map[role]
}

export function deliveryStatusLabel(status: DeliveryStatus): string {
  const map: Record<DeliveryStatus, string> = {
    pending_plant_confirmation: 'Waiting for plant confirmation',
    confirmed: 'Confirmed by plant',
    disputed: 'Disputed',
    awaiting_review: 'Waiting for an independent checker',
    corrections_requested: 'Corrections requested',
    reviewed: 'Evidence reviewed',
    rejected: 'Rejected',
  }
  return map[status]
}

export function impactLabelText(label: ImpactLabel): string {
  const map: Record<ImpactLabel, string> = {
    estimated: 'Estimated',
    reviewed: 'Reviewed',
    verified: 'Verified',
    issued: 'Issued',
    simulated: 'Simulated',
  }
  return map[label]
}

export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(isoDate))
}

export function formatDateTime(isoDate: string): string {
  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate))
}
