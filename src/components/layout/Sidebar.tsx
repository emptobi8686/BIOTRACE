import { NavLink, useNavigate } from 'react-router-dom'
import { LogOut, Settings, Building2 } from 'lucide-react'
import { BiotraceMark } from '@/components/brand/BiotraceMark'
import { getNavItemsForRole, getNavGroupsForRole } from '@/components/layout/nav-items'
import { roleLabel } from '@/lib/labels'
import { organizationTypeLabel } from '@/lib/onboarding'
import { useDemoSession } from '@/lib/demo-session'
import { DATA_MODE } from '@/lib/data-access'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'
import type { UserRole } from '@/types'

/**
 * Maps an organization type string (from the database) to the nearest UserRole
 * for navigation filtering purposes in Supabase mode.
 */
function orgTypeToRole(orgType: string | undefined): UserRole {
  switch (orgType) {
    case 'supplier':
      return 'supplier'
    case 'biomass_aggregator':
      return 'supplier' // aggregators see the same supply-chain nav as suppliers
    case 'cement_plant':
      return 'plant_operator'
    case 'independent_reviewer':
      return 'reviewer'
    case 'carbon_buyer':
      return 'buyer'
    default:
      return 'supplier' // safe default — fewest permissions
  }
}

interface SidebarProps {
  collapsed?: boolean
  onNavigate?: () => void
  /** Supabase mode: active org name */
  orgName?: string
  /** Supabase mode: active org type */
  orgType?: string
  /** Supabase mode: user email */
  userEmail?: string
  /** Supabase mode: user display name */
  userName?: string
  /** Supabase mode: sign-out handler */
  onSignOut?: () => void
}

function NavTooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="relative group/tip flex">
      {children}
      <span
        className="
          pointer-events-none absolute left-full top-1/2 z-50 ml-2.5 -translate-y-1/2
          whitespace-nowrap rounded-md border border-sidebar-border bg-popover
          px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md
          opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150
        "
        role="tooltip"
      >
        {label}
      </span>
    </span>
  )
}

export function Sidebar({
  collapsed = false,
  onNavigate,
  orgName,
  orgType,
  userEmail,
  userName,
  onSignOut,
}: SidebarProps) {
  const isSupabase = DATA_MODE === 'supabase'
  const { role, user } = useDemoSession()
  const navigate = useNavigate()

  // Derive display values from mode
  const displayName = isSupabase ? (userName ?? userEmail ?? '—') : user.name
  const displayEmail = isSupabase ? (userEmail ?? '') : ''
  const displayRole = isSupabase
    ? (orgType ? organizationTypeLabel(orgType) : 'Organization member')
    : roleLabel(role)
  const displayOrg = isSupabase ? (orgName ?? '') : user.organization

  // Initials for avatar
  const initials = displayName
    .split(' ')
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase()

  // Role-filtered nav — in Supabase mode derive role from active org type
  const navRole = isSupabase ? orgTypeToRole(orgType) : role
  const visibleItems = getNavItemsForRole(navRole)
  const visibleGroups = getNavGroupsForRole(navRole)

  function handleSignOut() {
    if (onSignOut) {
      onSignOut()
    } else {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div
      className="flex h-full flex-col bg-sidebar text-sidebar-foreground"
      data-collapsed={collapsed}
    >
      {/* ── Brand header ──────────────────────────────────────── */}
      <div
        className={cn(
          'flex min-h-[72px] shrink-0 items-center border-b border-sidebar-border',
          collapsed ? 'justify-center px-3' : 'gap-3 px-4',
        )}
      >
        {collapsed ? (
          <NavTooltip label="BIOTRACE">
            <span className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sidebar-foreground">
              <BiotraceMark className="size-5" />
            </span>
          </NavTooltip>
        ) : (
          <>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sidebar-foreground">
              <BiotraceMark className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-widest text-sidebar-foreground">
                BIOTRACE
              </p>
              <p className="truncate text-[11px] leading-4 text-sidebar-foreground/55">
                Traceable biomass
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── Organisation context (supabase mode only) ─────── */}
      {!collapsed && isSupabase && (orgName || orgType) && (
        <div className="mx-3 mt-3 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Building2 className="size-3.5 shrink-0 text-sidebar-foreground/60" aria-hidden />
            <p className="truncate text-xs font-medium text-sidebar-foreground/90">
              {orgName ?? 'Organization'}
            </p>
          </div>
          {orgType && (
            <p className="mt-0.5 truncate pl-5 text-[11px] text-sidebar-foreground/50">
              {organizationTypeLabel(orgType)}
            </p>
          )}
        </div>
      )}

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav
        className="flex-1 space-y-4 overflow-y-auto px-2.5 py-4"
        aria-label="Main navigation"
      >
        {visibleGroups.map((group) => {
          const items = visibleItems.filter((item) => item.group === group.id)
          if (items.length === 0) return null

          return (
            <div key={group.id} className="space-y-0.5">
              {!collapsed && (
                <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-sidebar-foreground/45">
                  {group.label}
                </p>
              )}
              {items.map((item) => {
                const Icon = item.icon
                const fullLabel = item.ready ? item.label : `${item.label} — coming soon`

                return collapsed ? (
                  <NavTooltip key={item.to} label={fullLabel}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/' || item.to === '/dashboard'}
                      onClick={onNavigate}
                      aria-label={fullLabel}
                      className={({ isActive }) =>
                        cn(
                          'flex size-10 items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                          !item.ready && 'opacity-60',
                        )
                      }
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                    </NavLink>
                  </NavTooltip>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/' || item.to === '/dashboard'}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                        isActive
                          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                          : 'font-normal text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                        !item.ready && 'opacity-60',
                      )
                    }
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {!item.ready && (
                      <span className="shrink-0 rounded bg-sidebar-border/80 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                        Soon
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* ── User / profile footer ──────────────────────────── */}
      <div className="shrink-0 border-t border-sidebar-border">
        {/* Settings row */}
        {!collapsed && (
          <div className="px-2.5 pt-2">
            <button
              type="button"
              className="flex w-full min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-normal text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              aria-label="Account settings"
              onClick={() => navigate('/onboarding')}
            >
              <Settings className="size-4 shrink-0" aria-hidden />
              <span>Settings</span>
            </button>
          </div>
        )}

        {/* Profile row */}
        <div
          className={cn(
            'px-2.5 pb-3 pt-1',
            collapsed && 'flex flex-col items-center gap-2 pt-3',
          )}
        >
          {collapsed ? (
            <>
              <NavTooltip label={`${displayRole}${displayOrg ? ` · ${displayOrg}` : ''}`}>
                <span
                  className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground"
                  aria-label={`User: ${displayName}`}
                >
                  {initials}
                </span>
              </NavTooltip>
              <NavTooltip label="Sign out">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex size-9 items-center justify-center rounded-lg text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" aria-hidden />
                </button>
              </NavTooltip>
            </>
          ) : (
            <div className="flex min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-accent-foreground"
                aria-hidden
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-sidebar-foreground/90">
                  {displayName}
                </p>
                <p className="truncate text-[11px] text-sidebar-foreground/50">
                  {displayEmail || displayRole}
                </p>
                {isSupabase && !displayEmail && displayRole && (
                  <p className="truncate text-[11px] text-sidebar-foreground/50">{displayRole}</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="size-3.5" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
