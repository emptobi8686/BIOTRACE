import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DEMO_ROLE_ORDER, useDemoSession } from '@/lib/demo-session'
import { roleLabel } from '@/lib/labels'
import type { UserRole } from '@/types'

export function DemoRoleSwitcher() {
  const { role, setRole } = useDemoSession()

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5">
      <div className="hidden text-left sm:block">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Demo role
        </p>
      </div>
      <Select value={role} onValueChange={(nextRole) => setRole(nextRole as UserRole)}>
        <SelectTrigger className="h-8 w-32 border-none bg-transparent px-2 text-xs shadow-none focus:ring-0 sm:w-40">
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
