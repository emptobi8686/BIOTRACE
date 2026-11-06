import { Construction, ArrowLeft } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { navItems } from '@/components/layout/nav-items'
import { Button } from '@/components/ui/button'
import { Link, useLocation } from 'react-router-dom'

export function ComingSoonPage() {
  const { pathname } = useLocation()
  const item = navItems.find((nav) => nav.to === pathname)

  return (
    <>
      <Header
        title={item?.label ?? 'Module'}
        subtitle="Scheduled for a future milestone"
      />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md text-center">
          {/* Icon */}
          <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
            <Construction className="size-7 text-muted-foreground/60" aria-hidden />
          </div>

          {/* Heading */}
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {item?.label ?? 'Coming soon'}
          </h1>

          {/* Description */}
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {item?.description
              ? `${item.description} This module is not yet available in the current milestone.`
              : 'This module is scheduled for a future milestone.'}
          </p>

          {/* Milestone note */}
          <p className="mt-3 text-xs text-muted-foreground/70">
            Navigation is wired so the application shell feels complete.
            Workflow screens arrive in later milestones.
          </p>

          {/* CTA */}
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">
                <ArrowLeft className="size-4" aria-hidden />
                Back to dashboard
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  )
}
