import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { AuthContext } from '@/lib/auth-context-core'

type Profile = Database['public']['Tables']['profiles']['Row']

interface ProfileState {
  userId: string
  profile: Profile | null
  error: string | null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = getSupabaseClient()
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [profileState, setProfileState] = useState<ProfileState | null>(null)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [profileRefreshKey, setProfileRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setSessionError(null)
      setIsLoading(false)
    })

    void (async () => {
      try {
        const { data, error } = await client.auth.getSession()
        if (!active) return
        setSession(data.session)
        setSessionError(error?.message ?? null)
      } catch (error) {
        if (!active) return
        setSession(null)
        setSessionError(
          error instanceof Error ? error.message : 'Unable to restore your session.',
        )
      } finally {
        if (active) setIsLoading(false)
      }
    })()

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  useEffect(() => {
    let active = true
    const userId = session?.user.id

    if (!userId) return () => {
      active = false
    }

    void (async () => {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        if (!active) return
        setProfileState({
          userId,
          profile: data,
          error: error?.message ?? null,
        })
      } catch (error) {
        if (!active) return
        setProfileState({
          userId,
          profile: null,
          error: error instanceof Error ? error.message : 'Unable to load your profile.',
        })
      }
    })()

    return () => {
      active = false
    }
  }, [client, session?.user.id, profileRefreshKey])

  const refreshProfile = useCallback(() => {
    setProfileRefreshKey((key) => key + 1)
  }, [])
  const userId = session?.user.id ?? null
  const matchingProfileState =
    userId && profileState?.userId === userId ? profileState : null
  const profile = matchingProfileState?.profile ?? null
  const isProfileLoading = Boolean(userId) && !matchingProfileState
  const profileError = matchingProfileState?.error ?? null

  const value = useMemo(
    () => ({
      session,
      profile,
      isLoading,
      isProfileLoading,
      sessionError,
      profileError,
      refreshProfile,
    }),
    [
      session,
      profile,
      isLoading,
      isProfileLoading,
      sessionError,
      profileError,
      refreshProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
