import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '@/lib/auth-context-core'

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.')
  }
  return context
}
