import { Header } from '@/components/layout/Header'
import { navItems } from '@/components/layout/nav-items'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Link, useLocation } from 'react-router-dom'

export function ComingSoonPage() {
  const { pathname } = useLocation()
  const item = navItems.find((nav) => nav.to === pathname)

  return (
    <>
      <Header
        title={item?.label ?? 'Module'}
        subtitle="Scheduled for a later milestone"
      />
      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
        <Card className="w-full max-w-lg shadow-none">
          <CardHeader>
            <CardTitle>{item?.label ?? 'Coming soon'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {item?.description ??
                'This module is not part of Milestone 1.'}{' '}
              Navigation is wired so the demo shell feels complete; the workflow
              screens arrive in Milestones 2–5.
            </p>
            <Button asChild>
              <Link to="/">Back to dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </>
  )
}
