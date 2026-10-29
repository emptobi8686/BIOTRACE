import { formatDateTime } from '@/lib/labels'
import type { ActivityEvent } from '@/types'

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="space-y-4">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1 size-2.5 shrink-0 rounded-full bg-primary" />
            {index < events.length - 1 ? (
              <span className="mt-1 w-px flex-1 bg-border" />
            ) : null}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-foreground">{event.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{event.detail}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(event.timestamp)} · {event.actor}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
