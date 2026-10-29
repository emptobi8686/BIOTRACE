import { NavLink } from 'react-router-dom'
import { brand, navItems } from '@/components/layout/nav-items'
import { roleLabel } from '@/lib/labels'
import { useDemoSession } from '@/lib/demo-session'
import { cn } from '@/lib/utils'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const BrandIcon = brand.Icon
  const { role, user } = useDemoSession()

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="flex size-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <BrandIcon className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-wide">
            {brand.name}
          </p>
          <p className="truncate text-xs text-sidebar-foreground/70">
            Climate-fintech MVP
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground',
                )
              }
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="flex-1 truncate">{item.label}</span>
              {!item.ready ? (
                <span className="rounded bg-sidebar-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-sidebar-foreground/60">
                  Soon
                </span>
              ) : null}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-sidebar-border px-5 py-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-sidebar-foreground/60">
          Demo mode
        </p>
        <p className="mt-2 text-xs font-medium text-sidebar-foreground/90">
          {roleLabel(role)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/65">
          {user.name} · {user.organization}
        </p>
        <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/65">
          {brand.tagline}
        </p>
      </div>
    </div>
  )
}
