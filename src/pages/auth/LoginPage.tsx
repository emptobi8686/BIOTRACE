import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthFrame, FormMessage } from '@/components/auth/AuthFrame'
import { GoogleButton, AuthDivider } from '@/components/auth/GoogleButton'
import { getSupabaseClient } from '@/lib/supabase'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const message = (location.state as { message?: string } | null)?.message
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const { error: signInError } = await getSupabaseClient().auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw signInError
      navigate('/onboarding', { replace: true })
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to sign in. Check your connection and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFrame
      title="Sign in to BIOTRACE"
      description="Access your organization workspace and verification status."
      footer={
        <p>
          No account yet?{' '}
          <Link to="/signup" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      }
    >
      <div className="space-y-4">
        {/* Google OAuth — primary CTA */}
        <GoogleButton mode="signin" disabled={isSubmitting} />

        <AuthDivider />

        {/* Email / password form */}
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {message && <FormMessage kind="info">{message}</FormMessage>}
          {error && <FormMessage kind="error">{error}</FormMessage>}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
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
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">Password</Label>
              <Link
                to="/reset-password"
                className="inline-flex min-h-8 items-center text-xs text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                tabIndex={0}
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
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
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in…' : 'Sign in with email'}
          </Button>
        </form>
      </div>
    </AuthFrame>
  )
}
