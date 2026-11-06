import { createContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isProfileLoading: boolean
  sessionError: string | null
  profileError: string | null
  refreshProfile: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
