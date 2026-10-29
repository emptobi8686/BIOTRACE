import { useEffect, useMemo, useState } from 'react'
import { demoUsers } from '@/data/seed-deliveries'
import type { DemoUser, UserRole } from '@/types'

export const DEMO_ROLE_ORDER: UserRole[] = [
  'administrator',
  'supplier',
  'plant_operator',
  'reviewer',
  'buyer',
]

const DEMO_SESSION_KEY = 'biotrace.demo-role'

export function isDemoRole(value: string): value is UserRole {
  return DEMO_ROLE_ORDER.includes(value as UserRole)
}

export function getDemoUserByRole(role: UserRole): DemoUser {
  const match = demoUsers.find((user) => user.role === role)
  if (match) return match

  return demoUsers[0]
}

export function getStoredDemoRole(): UserRole {
  if (typeof window === 'undefined') return 'administrator'
  const stored = window.localStorage.getItem(DEMO_SESSION_KEY)
  if (stored && isDemoRole(stored)) return stored
  return 'administrator'
}

export function setStoredDemoRole(role: UserRole): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(DEMO_SESSION_KEY, role)
}

export function useDemoSession() {
  const [role, setRoleState] = useState<UserRole>(() => getStoredDemoRole())

  useEffect(() => {
    setStoredDemoRole(role)
  }, [role])

  const activeUser = useMemo(() => getDemoUserByRole(role), [role])

  return {
    role,
    user: activeUser,
    setRole: (nextRole: UserRole) => {
      if (!isDemoRole(nextRole)) return
      setRoleState(nextRole)
    },
    availableRoles: DEMO_ROLE_ORDER,
  }
}
