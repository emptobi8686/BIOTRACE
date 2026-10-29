import { Badge } from '@/components/ui/badge'
import { deliveryStatusLabel, impactLabelText } from '@/lib/labels'
import { cn } from '@/lib/utils'
import type { DeliveryStatus, ImpactLabel } from '@/types'

const deliveryVariant: Record<DeliveryStatus, string> = {
  pending_plant_confirmation:
    'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-50',
  confirmed: 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-50',
  disputed: 'border-red-300 bg-red-50 text-red-900 hover:bg-red-50',
  awaiting_review:
    'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-50',
  corrections_requested:
    'border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-50',
  reviewed: 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/10',
  rejected: 'border-red-300 bg-red-50 text-red-900 hover:bg-red-50',
}

const impactVariant: Record<ImpactLabel, string> = {
  estimated: 'border-border bg-muted text-muted-foreground hover:bg-muted',
  reviewed: 'border-sky-300 bg-sky-50 text-sky-900 hover:bg-sky-50',
  verified: 'border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-50',
  issued: 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/10',
  simulated: 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-50',
}

export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn('font-medium', deliveryVariant[status])}
    >
      {deliveryStatusLabel(status)}
    </Badge>
  )
}

export function ImpactLabelBadge({ label }: { label: ImpactLabel }) {
  return (
    <Badge
      variant="outline"
      className={cn('text-[10px] uppercase tracking-wide', impactVariant[label])}
    >
      {impactLabelText(label)}
    </Badge>
  )
}
