import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthFrame, FormMessage } from '@/components/auth/AuthFrame'
import { GoogleButton, AuthDivider } from '@/components/auth/GoogleButton'
import {
  organizationTypeFromSignupPath,
  organizationTypeFromValue,
  organizationTypeLabel,
  signupSchema,
} from '@/lib/onboarding'
import { getSupabaseClient } from '@/lib/supabase'

export function SignupPage() {
  const navigate = useNavigate()
  const { rolePath } = useParams()
  const [searchParams] = useSearchParams()
  const selectedOrganizationType =
    organizationTypeFromSignupPath(rolePath ?? null) ??
    organizationTypeFromValue(searchParams.get('type'))

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const validation = signupSchema.safeParse({ fullName, email, password, confirmPassword })
    if (!validation.success) {
      setError(validation.error.issues[0]?.message ?? 'Check the information and try again.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data, error: signupError } = await getSupabaseClient().auth.signUp({
        email: validation.data.email,
        password: validation.data.password,
        options: {
          data: {
            full_name: validation.data.fullName,
            organization_type: selectedOrganizationType,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (signupError) throw signupError

      if (data.session) {
        navigate(`/onboarding?organizationType=${selectedOrganizationType}`, { replace: true })
      } else {
        setSuccess(
          'Account created. Check your email for a verification link before signing in.',
        )
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to create your account. Check your connection and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!selectedOrganizationType) return <Navigate to="/signup" replace />

  const orgLabel = organizationTypeLabel(selectedOrganizationType).toLowerCase()

  return (
    <AuthFrame
      title={`Create your ${orgLabel} account`}
      description={`Register a ${orgLabel} organization on BIOTRACE. Your personal profile is separate from your organization.`}
      footer={
        <p>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
          {' · '}
          <Link
            to="/signup"
            className="font-medium text-primary hover:underline"
          >
            Different organization type
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {/* Google OAuth — primary CTA */}
        <GoogleButton mode="signup" disabled={isSubmitting} />

        <AuthDivider />

        {/* Email / password form */}
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {error && <FormMessage kind="error">{error}</FormMessage>}
          {success && (
            <FormMessage kind="success">
              {success}
            </FormMessage>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={150}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-email">Email address</Label>
            <Input
              id="signup-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="signup-password">Password</Label>
            <div className="relative">
              <Input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Use at least 10 characters.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                required
                minLength={10}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
                aria-label={showConfirm ? 'Hide confirmation' : 'Show confirmation'}
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      </div>
    </AuthFrame>
  )
}
