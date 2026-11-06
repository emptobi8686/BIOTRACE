import { Navigate, Outlet } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { FormMessage } from '@/components/auth/AuthFrame'
import { useAuth } from '@/lib/use-auth'

function LoadingPanel({ message }: { message: string }) {
  return (
    <main className="flex min-h-svh max-w-none items-center justify-center px-4">
      <p className="text-sm text-muted-foreground" role="status">{message}</p>
    </main>
  )
}

export function ProtectedRoute() {
  const {
    session,
    profile,
    isLoading,
    isProfileLoading,
    sessionError,
    profileError,
    refreshProfile,
  } = useAuth()

  if (isLoading) return <LoadingPanel message="Restoring your secure session…" />
  if (sessionError) {
    return (
      <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 px-4">
        <FormMessage>{sessionError}</FormMessage>
        <Button asChild><a href="/login">Return to sign in</a></Button>
      </main>
    )
  }
  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ message: 'Sign in to continue. If your session expired, please sign in again.' }}
      />
    )
  }
  if (isProfileLoading) return <LoadingPanel message="Loading your account…" />
  if (profileError) {
    return (
      <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 px-4">
        <FormMessage>{`Unable to load your profile: ${profileError}`}</FormMessage>
        <Button type="button" onClick={refreshProfile}>Retry</Button>
      </main>
    )
  }
  if (!profile) {
    return (
      <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 px-4">
        <FormMessage>
          Your account profile was not provisioned. Please contact the BIOTRACE
          administrator; do not create a replacement account.
        </FormMessage>
      </main>
    )
  }
  if (profile.account_status === 'suspended') {
    return (
      <main className="mx-auto flex min-h-svh max-w-2xl flex-col justify-center gap-4 px-4">
        <FormMessage>
          This account is suspended. Contact BIOTRACE support for assistance.
        </FormMessage>
      </main>
    )
  }

  return <Outlet />
}
