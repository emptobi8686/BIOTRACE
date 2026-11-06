import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BiotraceMark } from '@/components/brand/BiotraceMark'
import { cn } from '@/lib/utils'

// ─── Brand panel background motif ────────────────────────────────────────────
// Subtle grid of dots in the brand panel — pure CSS, no images.
const dotGridStyle = {
  backgroundImage:
    'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
}

// ─── AuthFrame ────────────────────────────────────────────────────────────────
/**
 * Two-column auth layout:
 *   Left  → brand identity panel (hidden on mobile)
 *   Right → form panel
 *
 * On mobile: single centred column with compact brand header above the card.
 */
export function AuthFrame({
  title,
  description,
  children,
  /** Optional extra content below the form card (e.g. "Already have an account?") */
  footer,
  /** Override panel width. Default is balanced 2/5 brand · 3/5 form */
  panelWidth = 'default',
}: {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  panelWidth?: 'default' | 'narrow'
}) {
  return (
    <div className="flex min-h-svh flex-col lg:flex-row">
      {/* ── Brand panel (lg+) ──────────────────────────────────────────── */}
      <div
        className={cn(
          'hidden flex-col justify-between bg-sidebar p-10 lg:flex',
          panelWidth === 'narrow' ? 'lg:w-[340px] xl:w-[380px]' : 'lg:w-[420px] xl:w-[460px]',
        )}
        style={dotGridStyle}
        aria-hidden="true"
      >
        {/* Logo */}
        <Link
          to="/"
          tabIndex={-1}
          className="inline-flex items-center gap-2.5 text-sidebar-foreground"
        >
          <span className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary/20 text-sidebar-foreground">
            <BiotraceMark className="size-6" />
          </span>
          <span className="text-lg font-semibold tracking-widest">BIOTRACE</span>
        </Link>

        {/* Middle — tagline + pillars */}
        <div className="space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold leading-snug tracking-tight text-sidebar-foreground">
              Traceable biomass.<br />
              Measurable climate impact.
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-sidebar-foreground/60">
              End-to-end supply chain traceability from biomass sourcing through
              delivery, verification and environmental asset reporting.
            </p>
          </div>

          <ul className="space-y-3" role="list">
            {[
              'Delivery-to-plant traceability',
              'Independent MRV review',
              'Tamper-evident audit trail',
              'Multi-role access control',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sidebar-primary/20">
                  <svg
                    className="size-2.5 text-sidebar-foreground"
                    viewBox="0 0 10 10"
                    fill="currentColor"
                    aria-hidden
                  >
                    <circle cx="5" cy="5" r="3" />
                  </svg>
                </span>
                <span className="text-sm text-sidebar-foreground/75">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — compliance note */}
        <p className="text-[11px] leading-5 text-sidebar-foreground/35">
          Demo data only. BIOTRACE is not a carbon registry and does not issue credits.
        </p>
      </div>

      {/* ── Form panel ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:px-12">
        {/* Mobile-only compact brand header */}
        <div className="mb-6 lg:hidden">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold tracking-widest text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BiotraceMark className="size-4.5" />
            </span>
            BIOTRACE
          </Link>
        </div>

        <div className="w-full max-w-[420px]">
          {/* Form card header */}
          <div className="mb-6 space-y-1.5">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">{description}</p>
          </div>

          {/* Form card */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            {children}
          </div>

          {/* Below-card footer (links, etc.) */}
          {footer && (
            <div className="mt-5 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── FormMessage ──────────────────────────────────────────────────────────────
export function FormMessage({
  children,
  kind = 'error',
}: {
  children: ReactNode
  kind?: 'error' | 'success' | 'info' | 'warning'
}) {
  const styles: Record<string, string> = {
    error:
      'border-[color:var(--status-error)] bg-[color:var(--status-error-subtle)] text-[color:var(--status-error)]',
    success:
      'border-[color:var(--status-success)] bg-[color:var(--status-success-subtle)] text-[color:var(--status-success)]',
    info: 'border-border bg-muted text-foreground',
    warning:
      'border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)] text-[color:var(--status-warning)]',
  }

  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-lg border px-3.5 py-2.5 text-sm leading-5',
        styles[kind] ?? styles.info,
      )}
    >
      {children}
    </div>
  )
}

// ─── LoadingSpinner ───────────────────────────────────────────────────────────
export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="flex items-center justify-center gap-2.5 py-6 text-sm text-muted-foreground"
    >
      <span
        className="size-4 animate-spin rounded-full border-2 border-border border-t-primary"
        aria-hidden
      />
      <span>{label}</span>
    </div>
  )
}
