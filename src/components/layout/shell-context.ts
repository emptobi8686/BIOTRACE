import { createContext, useContext } from 'react'

interface ShellContextValue {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const ShellContext = createContext<ShellContextValue | null>(null)

export function useShellContext(): ShellContextValue {
  const context = useContext(ShellContext)
  if (!context) {
    throw new Error('useShellContext must be used within AppShell')
  }
  return context
}
