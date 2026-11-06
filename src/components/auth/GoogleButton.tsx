import { useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

interface GoogleButtonProps {
  /** 'signin' renders "Continue with Google", 'signup' renders "Sign up with Google" */
  mode?: 'signin' | 'signup'
  disabled?: boolean
  /** Override the post-OAuth redirect. Defaults to /auth/callback */
  redirectTo?: string
}

/**
 * Google OAuth button using the existing Supabase client.
 * No credentials are stored in frontend code — the OAuth flow is initiated
 * via supabase.auth.signInWithOAuth which redirects to Google and back.
 */
export function GoogleButton({
  mode = 'signin',
  disabled = false,
  redirectTo,
}: GoogleButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const label = mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'
  const loadingLabel = 'Redirecting to Google…'

  async function handleClick() {
    setIsLoading(true)
    setError(null)
    try {
      const { error: oauthError } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo ?? `${window.location.origin}/auth/callback`,
          queryParams: {
            // Request refresh token so sessions persist
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      })
      if (oauthError) throw oauthError
      // Page navigates away on success — loading state persists intentionally
    } catch (caught) {
      setIsLoading(false)
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to start Google sign-in. Check your connection and try again.',
      )
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-label={isLoading ? loadingLabel : label}
        className="
          relative flex w-full items-center justify-center gap-3
          rounded-lg border border-border bg-card
          px-4 py-2.5 text-sm font-medium text-foreground
          shadow-sm transition-all
          hover:bg-muted hover:border-border/80
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1
          disabled:pointer-events-none disabled:opacity-50
          active:translate-y-px
        "
      >
        {/* Google G logo — inline SVG, no external dependency */}
        {isLoading ? (
          <span
            className="size-[18px] animate-spin rounded-full border-2 border-border border-t-primary"
            aria-hidden
          />
        ) : (
          <svg
            aria-hidden="true"
            className="size-[18px] shrink-0"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.259c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
        )}
        <span>{isLoading ? loadingLabel : label}</span>
      </button>

      {error && (
        <p role="alert" className="text-center text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * OR divider — separates OAuth from email/password sections.
 */
export function AuthDivider() {
  return (
    <div className="relative flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" aria-hidden />
      <span className="shrink-0 text-xs font-medium text-muted-foreground">or</span>
      <div className="h-px flex-1 bg-border" aria-hidden />
    </div>
  )
}
