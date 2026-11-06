import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AuthFrame, FormMessage, LoadingSpinner } from '@/components/auth/AuthFrame'
import { useAuth } from '@/lib/use-auth'
import { organizationTypeFromValue } from '@/lib/onboarding'

export function AuthCallbackPage() {
  const { session, isLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const flow = searchParams.get('flow')

  // Extract error from both query string and URL hash (Supabase PKCE puts it in hash)
  const hashError = new URLSearchParams(window.location.hash.slice(1)).get('error_description')
  const displayError = (searchParams.get('error_description') ?? hashError)?.replace(/\+/g, ' ')

  const selectedOrganizationType = organizationTypeFromValue(
    session?.user.user_metadata.organization_type,
  )

  useEffect(() => {
    if (displayError) return
    if (isLoading) return
    if (session) {
      const callbackPath =
        flow === 'recovery'
          ? '/update-password'
          : selectedOrganizationType
            ? `/onboarding?organizationType=${selectedOrganizationType}`
            : '/onboarding'
      navigate(callbackPath, { replace: true })
    }
  }, [displayError, flow, isLoading, navigate, selectedOrganizationType, session])

  const isError = Boolean(displayError) || (!isLoading && !session)

  return (
    <AuthFrame
      title={isError ? 'Link could not be verified' : 'Verifying your link'}
      description={
        isError
          ? 'The link may have expired, already been used, or the request was cancelled.'
          : 'BIOTRACE is securely confirming your identity.'
      }
    >
      {isError ? (
        <div className="space-y-4">
          <FormMessage kind="error">
            {displayError ??
              'The authentication link could not be completed. Request a new one to continue.'}
          </FormMessage>
          <Button asChild className="w-full">
            <Link to={flow === 'recovery' ? '/reset-password' : '/login'}>
              {flow === 'recovery' ? 'Request a new reset link' : 'Return to sign in'}
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/signup">Create a new account</Link>
          </Button>
        </div>
      ) : (
        <LoadingSpinner label="Confirming your email and restoring your session…" />
      )}
    </AuthFrame>
  )
}
