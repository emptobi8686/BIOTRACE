import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { BiotraceMark } from '@/components/brand/BiotraceMark'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { DATA_MODE } from '@/lib/data-access'

const NAV_LINKS = [
  { label: 'Product', to: '/#product' },
  { label: 'How it works', to: '/how-it-works' },
  { label: 'Stakeholders', to: '/#stakeholders' },
  { label: 'About', to: '/about' },
]

const CURRENT_YEAR = new Date().getFullYear()

export function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const navigate = useNavigate()
  const appRoot = DATA_MODE === 'supabase' ? '/login' : '/dashboard'

  function handleGetStarted() {
    navigate(DATA_MODE === 'supabase' ? '/signup' : '/dashboard')
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* ── Top navigation ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link
            to="/"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold tracking-widest text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="BIOTRACE homepage"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <BiotraceMark className="size-4.5" />
            </span>
            BIOTRACE
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary navigation">
            {NAV_LINKS.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isActive && !to.includes('#')
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden items-center gap-2 md:flex">
            <Button asChild variant="ghost" size="sm">
              <Link to={appRoot}>Sign in</Link>
            </Button>
            <Button size="sm" onClick={handleGetStarted}>
              Get started
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden">
            <nav className="flex flex-col gap-0.5" aria-label="Mobile navigation">
              {NAV_LINKS.map(({ label, to }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  {label}
                </Link>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                <Button asChild variant="outline" className="w-full" onClick={() => setMobileOpen(false)}>
                  <Link to={appRoot}>Sign in</Link>
                </Button>
                <Button
                  className="w-full"
                  onClick={() => { setMobileOpen(false); handleGetStarted() }}
                >
                  Get started
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ── Page content ────────────────────────────────────── */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="space-y-3">
              <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-widest text-foreground">
                <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <BiotraceMark className="size-4" />
                </span>
                BIOTRACE
              </Link>
              <p className="text-xs leading-5 text-muted-foreground max-w-xs">
                Traceable biomass. Measurable climate impact.
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                Credit issuance and registry interactions in this prototype are simulated.
              </p>
            </div>

            {/* Product */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Product</p>
              <ul className="space-y-2">
                {[
                  ['How it works', '/how-it-works'],
                  ['Platform', '/#product'],
                  ['Stakeholders', '/#stakeholders'],
                ].map(([label, to]) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Company</p>
              <ul className="space-y-2">
                {[
                  ['About', '/about'],
                ].map(([label, to]) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Access */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Access</p>
              <ul className="space-y-2">
                {[
                  ['Sign in', '/login'],
                  ['Register organization', '/signup'],
                ].map(([label, to]) => (
                  <li key={to}>
                    <Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-muted-foreground">
              © 2024–{CURRENT_YEAR} BIOTRACE. This is a prototype platform.
            </p>
            <p className="text-xs text-muted-foreground/60">
              No real carbon credits are issued. No real payments are processed.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
