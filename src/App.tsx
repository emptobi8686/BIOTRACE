import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

// Public pages
import { PublicLayout } from '@/components/public/PublicLayout'
import { HomePage } from '@/pages/public/HomePage'
import { HowItWorksPage } from '@/pages/public/HowItWorksPage'
import { AboutPage } from '@/pages/public/AboutPage'

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage'
import { RoleSelectionPage } from '@/pages/auth/RoleSelectionPage'
import { SignupPage } from '@/pages/auth/SignupPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { AuthCallbackPage } from '@/pages/auth/AuthCallbackPage'
import { OnboardingPage } from '@/pages/auth/OnboardingPage'
import { UpdatePasswordPage } from '@/pages/auth/UpdatePasswordPage'

// App pages
import { AppShell } from '@/components/layout/AppShell'
import { AuthenticatedLayout } from '@/components/auth/AuthenticatedLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AuthProvider } from '@/lib/auth-context'
import { ComingSoonPage } from '@/pages/ComingSoonPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { DeliveriesPage } from '@/pages/DeliveriesPage'
import { DeliveryDetailPage } from '@/pages/DeliveryDetailPage'
import { SubmitDeliveryPage } from '@/pages/SubmitDeliveryPage'
import { PlantConfirmationPage } from '@/pages/PlantConfirmationPage'
import { ReviewQueuePage } from '@/pages/ReviewQueuePage'
import { ReviewPage } from '@/pages/ReviewPage'
import { AdminPage } from '@/pages/AdminPage'
import { WorkspacePage } from '@/pages/WorkspacePage'

// v2.1 admin feature pages
import { PlantEligibilityPage } from '@/pages/admin/PlantEligibilityPage'
import { IssuanceBatchesPage } from '@/pages/admin/IssuanceBatchesPage'
import { ReviewFeesPage } from '@/pages/admin/ReviewFeesPage'
import { SaleAllocationsPage } from '@/pages/admin/SaleAllocationsPage'

import { DATA_MODE, formatDataAccessStatus } from '@/lib/data-access'

export default function App() {
  // Configuration error — shown before any routing
  if (DATA_MODE === 'configuration-error') {
    return (
      <main className="mx-auto flex min-h-screen max-w-2xl items-center px-6">
        <section
          aria-live="polite"
          className="w-full rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm"
          role="alert"
        >
          <h1 className="text-xl font-semibold">Backend is not ready</h1>
          <p className="mt-3 text-muted-foreground">{formatDataAccessStatus()}</p>
        </section>
      </main>
    )
  }

  // ── Supabase mode: full auth + public routes ──────────────────────────────
  if (DATA_MODE === 'supabase') {
    return (
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* ── Public routes (no auth required) ── */}
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/about" element={<AboutPage />} />
            </Route>

            {/* ── Auth routes (no shell) ── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<RoleSelectionPage />} />
            <Route path="/signup/:rolePath" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ResetPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* ── Protected routes ── */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AuthenticatedLayout />}>
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/update-password" element={<UpdatePasswordPage />} />
                <Route path="/workspace/:organizationId" element={<WorkspacePage />} />

                {/* Admin standalone (uses AuthenticatedLayout bar, not AppShell) */}
                <Route path="/admin" element={<AdminPage />} />

                {/* Operational routes inside AppShell */}
                <Route element={<AppShell />}>
                  {/* Dashboard */}
                  <Route path="/dashboard" element={<DashboardPage />} />

                  {/* Deliveries */}
                  <Route path="/deliveries" element={<DeliveriesPage />} />
                  <Route path="/deliveries/new" element={<SubmitDeliveryPage />} />
                  <Route path="/deliveries/:id" element={<DeliveryDetailPage />} />
                  <Route path="/deliveries/:id/confirm" element={<PlantConfirmationPage />} />

                  {/* Review */}
                  <Route path="/review" element={<ReviewQueuePage />} />
                  <Route path="/review/:id" element={<ReviewPage />} />

                  {/* Coming soon */}
                  <Route path="/plant" element={<ComingSoonPage />} />
                  <Route path="/projects" element={<ComingSoonPage />} />
                  <Route path="/marketplace" element={<ComingSoonPage />} />

                  {/* v2.1 Admin features */}
                  <Route path="/app/admin/eligibility" element={<PlantEligibilityPage />} />
                  <Route path="/app/admin/batches" element={<IssuanceBatchesPage />} />
                  <Route path="/app/admin/fees" element={<ReviewFeesPage />} />
                  <Route path="/app/admin/allocations" element={<SaleAllocationsPage />} />
                </Route>

                {/* Redirect authenticated root to onboarding flow */}
                <Route path="/app" element={<Navigate to="/onboarding" replace />} />
              </Route>
            </Route>

            {/* Catch-all: redirect unknown paths to homepage */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    )
  }

  // ── Demo mode: public routes + demo app (no auth) ────────────────────────
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes available in demo mode too */}
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/about" element={<AboutPage />} />
        </Route>

        {/* Demo operational routes */}
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />

          <Route path="/deliveries" element={<DeliveriesPage />} />
          <Route path="/deliveries/new" element={<SubmitDeliveryPage />} />
          <Route path="/deliveries/:id" element={<DeliveryDetailPage />} />
          <Route path="/deliveries/:id/confirm" element={<PlantConfirmationPage />} />

          <Route path="/plant" element={<ComingSoonPage />} />

          <Route path="/review" element={<ReviewQueuePage />} />
          <Route path="/review/:id" element={<ReviewPage />} />

          <Route path="/projects" element={<ComingSoonPage />} />
          <Route path="/marketplace" element={<ComingSoonPage />} />

          {/* v2.1 admin pages available in demo mode (show feature, require Supabase) */}
          <Route path="/app/admin/eligibility" element={<PlantEligibilityPage />} />
          <Route path="/app/admin/batches" element={<IssuanceBatchesPage />} />
          <Route path="/app/admin/fees" element={<ReviewFeesPage />} />
          <Route path="/app/admin/allocations" element={<SaleAllocationsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
