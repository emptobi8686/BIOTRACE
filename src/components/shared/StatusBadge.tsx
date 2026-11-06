import { deliveryStatusLabel, impactLabelText } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { DeliveryStatus, ImpactLabel } from '@/types'

// ─── Delivery status ──────────────────────────────────────────────────────────
// Using semantic CSS custom properties defined in index.css instead of
// hardcoded Tailwind colour classes.
const deliveryVariantClass: Record<DeliveryStatus, string> = {
  pending_plant_confirmation: 'status-badge status-badge--pending',
  confirmed: 'status-badge status-badge--success',
  disputed: 'status-badge status-badge--error',
  awaiting_review: 'status-badge status-badge--info',
  corrections_requested: 'status-badge status-badge--warning',
  reviewed: 'status-badge status-badge--verified',
  rejected: 'status-badge status-badge--rejected',
}

// ─── Impact label ─────────────────────────────────────────────────────────────
const impactVariantClass: Record<ImpactLabel, string> = {
  estimated: 'status-badge status-badge--pending',
  reviewed: 'status-badge status-badge--info',
  verified: 'status-badge status-badge--verified',
  issued: 'status-badge status-badge--success',
  simulated: 'status-badge status-badge--warning',
}

export function DeliveryStatusBadge({ status, className }: { status: DeliveryStatus; className?: string }) {
  return (
    <span
      className={cn(deliveryVariantClass[status], 'font-medium', className)}
      aria-label={`Status: ${deliveryStatusLabel(status)}`}
    >
      {deliveryStatusLabel(status)}
    </span>
  )
}

export function ImpactLabelBadge({ label, className }: { label: ImpactLabel; className?: string }) {
  return (
    <span
      className={cn(impactVariantClass[label], 'text-[10px] uppercase tracking-wide', className)}
      aria-label={`Impact label: ${impactLabelText(label)}`}
    >
      {impactLabelText(label)}
    </span>
  )
}

// ─── Verification status badge ────────────────────────────────────────────────
export function VerificationStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'status-badge status-badge--success',
    rejected: 'status-badge status-badge--rejected',
    additional_information_required: 'status-badge status-badge--warning',
    under_review: 'status-badge status-badge--info',
    pending: 'status-badge status-badge--pending',
    submitted: 'status-badge status-badge--pending',
    suspended: 'status-badge status-badge--error',
  }
  const labels: Record<string, string> = {
    approved: 'Approved',
    rejected: 'Rejected',
    additional_information_required: 'More information required',
    under_review: 'Under review',
    pending: 'Submitted',
    submitted: 'Submitted',
    suspended: 'Suspended',
  }
  const cls = styles[status] ?? 'status-badge status-badge--disabled'
  return (
    <span className={cn(cls, 'font-medium')}>
      {labels[status] ?? status}
    </span>
  )
}
