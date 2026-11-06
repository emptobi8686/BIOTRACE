import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DEMO_ROLE_ORDER, useDemoSession } from '@/lib/demo-session'
import { roleLabel } from '@/lib/labels'
import type { UserRole } from '@/types'

export function DemoRoleSwitcher() {
  const { role, setRole } = useDemoSession()

  return (
    <div className="flex min-w-0 items-center gap-1 rounded-lg border border-border bg-muted/50 px-1.5 py-1 sm:gap-2 sm:px-2.5">
      <div className="hidden text-left sm:block">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Demo role
        </p>
      </div>
      <Select value={role} onValueChange={(nextRole) => setRole(nextRole as UserRole)}>
        <SelectTrigger className="h-9 w-[6.75rem] border-none bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-2 sm:h-8 sm:w-40 sm:px-2 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:overflow-hidden [&_[data-slot=select-value]]:text-ellipsis">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DEMO_ROLE_ORDER.map((option) => (
            <SelectItem key={option} value={option}>
              {roleLabel(option)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="hidden text-[10px] text-muted-foreground sm:inline">Demo only</span>
    </div>
  )
}
