import { ChevronRight, Menu, PanelLeftClose, PanelLeftOpen, Bell } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Sidebar } from '@/components/layout/Sidebar'
import { DemoRoleSwitcher } from '@/components/layout/DemoRoleSwitcher'
import { useDemoSession } from '@/lib/demo-session'
import { roleLabel } from '@/lib/labels'
import { useShellContext } from '@/components/layout/shell-context'
import { DATA_MODE } from '@/lib/data-access'
import { useState } from 'react'

/** Build breadcrumb trail from current pathname */
function getBreadcrumbs(pathname: string): { label: string; to: string }[] {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return []

  if (segments[0] === 'deliveries') {
    if (segments.length === 1) return []
    if (segments[1] === 'new') {
      return [{ label: 'Deliveries', to: '/deliveries' }]
    }
    if (segments[2] === 'confirm') {
      return [
        { label: 'Deliveries', to: '/deliveries' },
        { label: 'Delivery details', to: `/deliveries/${segments[1]}` },
      ]
    }
    return [{ label: 'Deliveries', to: '/deliveries' }]
  }

  if (segments[0] === 'review' && segments.length > 1) {
    return [{ label: 'Review queue', to: '/review' }]
  }

  return []
}

/** Page-title map for known routes */
function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0 || segments[0] === 'dashboard') return 'Dashboard'
  if (segments[0] === 'deliveries') {
    if (segments.length === 1) return 'Deliveries'
    if (segments[1] === 'new') return 'New delivery'
    if (segments[2] === 'confirm') return 'Confirm delivery'
    return 'Delivery details'
  }
  if (segments[0] === 'review') {
    if (segments.length === 1) return 'Review queue'
    return 'Review delivery'
  }
  if (segments[0] === 'plant') return 'Plant weighing'
  if (segments[0] === 'projects') return 'Projects'
  if (segments[0] === 'marketplace') return 'Marketplace'
  if (segments[0] === 'admin') return 'Administration'
  return ''
}

interface HeaderProps {
  title?: string
  subtitle?: string
  /** Supabase mode: pass sign-out handler through shell */
  onSignOut?: () => void
}

export function Header({ title, subtitle, onSignOut }: HeaderProps) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { sidebarCollapsed, toggleSidebar } = useShellContext()
  const { user, role } = useDemoSession()
  const isDemo = DATA_MODE !== 'supabase'

  const pageTitle = title ?? getPageTitle(pathname)
  const breadcrumbs = getBreadcrumbs(pathname)

  const initials = user.name
    .split(' ')
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
      <div className="flex min-h-16 items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-5">

        {/* Left: mobile hamburger + sidebar toggle + breadcrumb + title */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          {/* Mobile hamburger */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="size-4" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[min(17rem,85vw)] p-0">
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation</SheetTitle>
              </SheetHeader>
              <Sidebar
                collapsed={false}
                onNavigate={() => setOpen(false)}
                onSignOut={onSignOut}
              />
            </SheetContent>
          </Sheet>

          {/* Desktop sidebar collapse toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="hidden shrink-0 text-muted-foreground lg:inline-flex"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={toggleSidebar}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="size-4" aria-hidden />
            ) : (
              <PanelLeftClose className="size-4" aria-hidden />
            )}
          </Button>

          {/* Title + breadcrumb */}
          <div className="min-w-0">
            {breadcrumbs.length > 0 && (
              <nav
                aria-label="Breadcrumb"
                className="mb-0.5 hidden items-center gap-1 text-xs text-muted-foreground sm:flex"
              >
                {breadcrumbs.map((crumb, index) => (
                  <span
                    key={`${crumb.to}-${index}`}
                    className="inline-flex min-w-0 items-center gap-1"
                  >
                    {index > 0 && (
                      <ChevronRight className="size-3 shrink-0" aria-hidden />
                    )}
                    <Link
                      to={crumb.to}
                      className="truncate rounded-sm hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {crumb.label}
                    </Link>
                  </span>
                ))}
              </nav>
            )}
            <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-[17px]">
              {pageTitle}
            </h1>
            {subtitle && (
              <p className="hidden truncate text-xs text-muted-foreground sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right: demo switcher + notifications + avatar */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Demo role switcher — only in demo mode */}
          {isDemo && <DemoRoleSwitcher />}

          {/* Notification bell — placeholder (no backend yet) */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell className="size-4" aria-hidden />
          </Button>

          {/* Avatar + name — hidden on xs, shown sm+ */}
          <div className="hidden items-center gap-2 sm:flex">
            {isDemo && (
              <div className="hidden text-right md:block">
                <p className="text-xs font-medium text-foreground">{user.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {roleLabel(role)}
                  {isDemo && (
                    <span
                      className="ml-1 rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wider"
                      style={{
                        background: 'var(--status-warning-subtle)',
                        color: 'var(--status-warning)',
                      }}
                    >
                      Demo
                    </span>
                  )}
                </p>
              </div>
            )}
            <span
              className="flex size-8 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground"
              aria-hidden
            >
              {initials}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
