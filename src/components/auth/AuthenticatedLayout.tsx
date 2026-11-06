import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { OrganizationProvider } from '@/lib/organization-context'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/lib/use-auth'

/**
 * AuthenticatedLayout wraps all routes that require a signed-in user.
 *
 * Responsibilities:
 * - Provides OrganizationProvider context for org-aware children.
 * - Does NOT render a separate sticky header bar — org context is now displayed
 *   inside the Sidebar (via AppShell → SupabaseShellInner) when the user is in
 *   the AppShell. For pre-shell pages (onboarding, admin, workspace) a minimal
 *   top bar is rendered below.
 * - Provides sign-out capability to the bare top bar on non-shell pages.
 */

function BareTopBar() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true
    if (!session) return () => { active = false }
    void (async () => {
      try {
        const { data } = await getSupabaseClient()
          .from('platform_admins')
          .select('user_id')
          .eq('user_id', session.user.id)
          .maybeSingle()
        if (active && data) setIsAdmin(true)
      } catch {
        // not an admin — fine
      }
    })()
    return () => { active = false }
  }, [session])

  async function handleSignOut() {
    try {
      await getSupabaseClient().auth.signOut()
    } catch {
      // best-effort
    }
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left: org navigation */}
        <nav className="flex items-center gap-3 text-sm" aria-label="Account navigation">
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="font-medium text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
          >
            Organizations
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded px-1"
            >
              Admin portal
            </button>
          )}
        </nav>

        {/* Right: email + sign out */}
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-muted-foreground md:block">
            {session?.user.email}
          </span>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}

export function AuthenticatedLayout() {
  return (
    <OrganizationProvider>
      <BareTopBar />
      <Outlet />
    </OrganizationProvider>
  )
}
