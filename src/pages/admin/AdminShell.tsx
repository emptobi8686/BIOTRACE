/**
 * Shared shell for v2.1 admin feature pages.
 * Wraps each page with a consistent page header, breadcrumb back-link,
 * and a prominent "requires Supabase mode" notice when in demo mode.
 */
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { DATA_MODE } from '@/lib/data-access'

interface AdminShellProps {
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
  children: ReactNode
  /** Extra disclaimer shown below the demo banner */
  notice?: ReactNode
}

/** Orange "Requires Supabase mode" banner shown in demo mode */
export function SupabaseRequiredBanner() {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-lg border border-[color:var(--status-warning)] bg-[color:var(--status-warning-subtle)] px-4 py-3 text-sm text-[color:var(--status-warning)]"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">Feature requires Supabase mode</p>
        <p className="mt-0.5 text-xs">
          This feature stores data in the hosted Supabase database. Configure{' '}
          <code className="rounded bg-[color:var(--status-warning-subtle)] px-1">
            VITE_DATA_MODE=supabase
          </code>{' '}
          and valid Supabase credentials to enable it.
        </p>
      </div>
    </div>
  )
}

/** Green simulated-notice shown on all pages regardless of mode */
export function SimulatedNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="note"
      className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground"
    >
      <span className="mt-0.5 size-2 shrink-0 rounded-full bg-[color:var(--status-warning)]" aria-hidden />
      {children}
    </div>
  )
}

export function AdminShell({
  title,
  subtitle,
  backTo = '/admin',
  backLabel = 'Admin portal',
  children,
  notice,
}: AdminShellProps) {
  return (
    <>
      <Header title={title} subtitle={subtitle} />
      <main className="flex-1 space-y-5 px-4 py-6 sm:px-6">
        {/* Back link */}
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          {backLabel}
        </Link>

        {/* Demo mode banner */}
        {DATA_MODE !== 'supabase' && <SupabaseRequiredBanner />}

        {/* Page-specific notice */}
        {notice}

        {children}
      </main>
    </>
  )
}
