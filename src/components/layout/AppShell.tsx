import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { ShellContext } from '@/components/layout/shell-context'
import { DATA_MODE } from '@/lib/data-access'
import { getSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/lib/use-auth'
import { useOrganizations } from '@/lib/organization-context'

/**
 * Supabase-mode inner shell — reads org context from OrganizationProvider,
 * which is always mounted above this by AuthenticatedLayout.
 */
function SupabaseShellInner({
  sidebarCollapsed,
  onSignOut,
}: {
  sidebarCollapsed: boolean
  onSignOut: () => void
}) {
  const { session } = useAuth()
  const { activeOrganization } = useOrganizations()

  const userEmail = session?.user.email
  const userName =
    session?.user.user_metadata?.full_name as string | undefined ??
    session?.user.user_metadata?.name as string | undefined

  return (
    <Sidebar
      collapsed={sidebarCollapsed}
      onSignOut={onSignOut}
      orgName={activeOrganization?.name}
      orgType={activeOrganization?.organizationType}
      userEmail={userEmail}
      userName={userName}
    />
  )
}

function SupabaseAppShell() {
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  async function handleSignOut() {
    try {
      await getSupabaseClient().auth.signOut()
    } catch {
      // best-effort
    }
    navigate('/login', { replace: true })
  }

  function toggleSidebar() {
    setSidebarCollapsed((c) => !c)
  }

  return (
    <ShellContext.Provider value={{ sidebarCollapsed, toggleSidebar }}>
      <div className="flex min-h-svh bg-background">
        <aside
          className={`sticky top-0 hidden h-svh shrink-0 transition-[width] duration-200 lg:block ${
            sidebarCollapsed ? 'w-[4.5rem]' : 'w-[15.5rem]'
          }`}
        >
          <SupabaseShellInner
            sidebarCollapsed={sidebarCollapsed}
            onSignOut={handleSignOut}
          />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </ShellContext.Provider>
  )
}

/**
 * Demo-mode shell: no auth context needed.
 */
function DemoAppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  function toggleSidebar() {
    setSidebarCollapsed((c) => !c)
  }

  return (
    <ShellContext.Provider value={{ sidebarCollapsed, toggleSidebar }}>
      <div className="flex min-h-svh bg-background">
        <aside
          className={`sticky top-0 hidden h-svh shrink-0 transition-[width] duration-200 lg:block ${
            sidebarCollapsed ? 'w-[4.5rem]' : 'w-[15.5rem]'
          }`}
        >
          <Sidebar collapsed={sidebarCollapsed} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </ShellContext.Provider>
  )
}

export function AppShell() {
  if (DATA_MODE === 'supabase') return <SupabaseAppShell />
  return <DemoAppShell />
}
