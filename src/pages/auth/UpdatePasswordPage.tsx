import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthFrame, FormMessage } from '@/components/auth/AuthFrame'
import { useAuth } from '@/lib/use-auth'
import { getSupabaseClient } from '@/lib/supabase'

export function UpdatePasswordPage() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (password.length < 10) {
      setError('Use at least 10 characters.')
      return
    }
    if (password !== confirmation) {
      setError('Passwords do not match.')
      return
    }
    setIsSubmitting(true)
    try {
      const { error: updateError } = await getSupabaseClient().auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess(true)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to update your password. Request a new reset link and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFrame
      title="Choose a new password"
      description="Set a new password for your BIOTRACE account."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {success ? (
        <div className="space-y-4">
          <FormMessage kind="success">Your password has been updated successfully.</FormMessage>
          <Button
            className="w-full"
            onClick={() => navigate('/onboarding', { replace: true })}
          >
            Continue to your account
          </Button>
        </div>
      ) : session ? (
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {error && <FormMessage kind="error">{error}</FormMessage>}

          <div className="space-y-1.5">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={10}
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
                {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Use at least 10 characters.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-new-password">Confirm new password</Label>
            <div className="relative">
              <Input
                id="confirm-new-password"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                minLength={10}
                required
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
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

          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <FormMessage kind="error">
            This password-reset link is no longer active. Request a new link to continue.
          </FormMessage>
          <Button asChild className="w-full">
            <Link to="/reset-password">Request another link</Link>
          </Button>
        </div>
      )}
    </AuthFrame>
  )
}
