import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getMyOrganizations, type OnboardingOrganization } from '@/lib/organizations'
import { useAuth } from '@/lib/use-auth'

interface OrganizationContextValue {
  organizations: OnboardingOrganization[]
  activeOrganization: OnboardingOrganization | null
  activeOrganizationId: string | null
  isLoading: boolean
  error: string | null
  refreshOrganizations: (preferredOrganizationId?: string) => Promise<void>
  setActiveOrganizationId: (organizationId: string | null) => void
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const [organizations, setOrganizations] = useState<OnboardingOrganization[]>([])
  const [activeOrganizationId, setActiveOrganizationIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(userId))
  const [error, setError] = useState<string | null>(null)

  const refreshOrganizations = useCallback(async (preferredOrganizationId?: string) => {
    if (!userId) {
      setOrganizations([])
      setActiveOrganizationIdState(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await getMyOrganizations(userId)
      setOrganizations(result)
      setError(null)
      setActiveOrganizationIdState((currentId) => {
        if (currentId && result.some((organization) => organization.id === currentId)) {
          return currentId
        }
        if (preferredOrganizationId && result.some((organization) => organization.id === preferredOrganizationId)) {
          return preferredOrganizationId
        }
        return result.length === 1 ? result[0].id : null
      })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load your organizations.')
      throw caught
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let active = true
    if (!userId) {
      setOrganizations([])
      setActiveOrganizationIdState(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    void getMyOrganizations(userId)
      .then((result) => {
        if (!active) return
        setOrganizations(result)
        setError(null)
        setActiveOrganizationIdState((currentId) => {
          if (currentId && result.some((organization) => organization.id === currentId)) {
            return currentId
          }
          return result.length === 1 ? result[0].id : null
        })
      })
      .catch((caught: unknown) => {
        if (!active) return
        setError(caught instanceof Error ? caught.message : 'Unable to load your organizations.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId])

  const setActiveOrganizationId = useCallback((organizationId: string | null) => {
    if (
      organizationId === null ||
      organizations.some((organization) => organization.id === organizationId)
    ) {
      setActiveOrganizationIdState(organizationId)
    }
  }, [organizations])

  const activeOrganization =
    organizations.find((organization) => organization.id === activeOrganizationId) ?? null
  const value = useMemo(
    () => ({
      organizations,
      activeOrganization,
      activeOrganizationId,
      isLoading,
      error,
      refreshOrganizations,
      setActiveOrganizationId,
    }),
    [
      organizations,
      activeOrganization,
      activeOrganizationId,
      isLoading,
      error,
      refreshOrganizations,
      setActiveOrganizationId,
    ],
  )

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export function useOrganizations(): OrganizationContextValue {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganizations must be used within OrganizationProvider.')
  }
  return context
}
