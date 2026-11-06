import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthFrame, FormMessage } from '@/components/auth/AuthFrame'
import { getSupabaseClient } from '@/lib/supabase'

export function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/callback?flow=recovery`,
        },
      )
      if (resetError) throw resetError
      setSent(true)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to request a password reset. Check your connection and try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthFrame
      title="Reset your password"
      description="Enter your email address and we'll send a secure reset link if the account is eligible."
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="space-y-4">
          <FormMessage kind="success">
            If that email is registered, a password-reset link will arrive shortly. Check your
            inbox and spam folder.
          </FormMessage>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Return to sign in</Link>
          </Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          {error && <FormMessage kind="error">{error}</FormMessage>}
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email address</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthFrame>
  )
}
