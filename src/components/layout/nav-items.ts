import type { LucideIcon } from 'lucide-react'
import {
  ClipboardCheck,
  Factory,
  LayoutDashboard,
  Scale,
  ShieldCheck,
  ShoppingCart,
  Truck,
  Wheat,
  Leaf,
  PackageCheck,
  DollarSign,
  ReceiptText,
} from 'lucide-react'
import type { UserRole } from '@/types'
import { DATA_MODE } from '@/lib/data-access'

export type NavAudience = UserRole | 'aggregator'
export type NavGroupId = 'workspace' | 'operations' | 'assurance' | 'commercial' | 'admin'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  description: string
  ready: boolean
  group: NavGroupId
  audiences: readonly NavAudience[]
}

export const navGroups: { id: NavGroupId; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'operations', label: 'Operations' },
  { id: 'assurance', label: 'Climate assurance' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'admin', label: 'Administration' },
]

const allAudiences: readonly NavAudience[] = [
  'supplier',
  'aggregator',
  'plant_operator',
  'reviewer',
  'buyer',
  'administrator',
]

const deliveryAudiences: readonly NavAudience[] = [
  'supplier',
  'aggregator',
  'plant_operator',
  'reviewer',
  'administrator',
]

const assuranceAudiences: readonly NavAudience[] = [
  'reviewer',
  'buyer',
  'administrator',
]

const commercialAudiences: readonly NavAudience[] = ['buyer', 'administrator']

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    to: DATA_MODE === 'supabase' ? '/dashboard' : '/',
    icon: LayoutDashboard,
    description: 'Overview of deliveries, impact and performance metrics',
    ready: true,
    group: 'workspace',
    audiences: allAudiences,
  },
  {
    label: 'Admin',
    to: '/admin',
    icon: ShieldCheck,
    description: 'Approve or reject organization registrations',
    ready: true,
    group: 'workspace',
    audiences: ['administrator'],
  },
  {
    label: 'Deliveries',
    to: '/deliveries',
    icon: Truck,
    description: 'Biomass delivery submissions and plant confirmations',
    ready: true,
    group: 'operations',
    audiences: deliveryAudiences,
  },
  {
    label: 'Plant weighing',
    to: '/plant',
    icon: Scale,
    description: 'Measured weights and weighing-ticket evidence',
    ready: false,
    group: 'operations',
    audiences: ['plant_operator', 'aggregator', 'administrator'],
  },
  {
    label: 'Review & MRV',
    to: '/review',
    icon: ClipboardCheck,
    description: 'Independent review and transparent MRV calculations',
    ready: true,
    group: 'assurance',
    audiences: assuranceAudiences,
  },
  {
    label: 'Projects',
    to: '/projects',
    icon: Factory,
    description: 'Cement plant projects and methodology inputs',
    ready: false,
    group: 'assurance',
    audiences: assuranceAudiences,
  },
  {
    label: 'Marketplace',
    to: '/marketplace',
    icon: ShoppingCart,
    description: 'Eligible inventory and environmental asset orders',
    ready: false,
    group: 'commercial',
    audiences: commercialAudiences,
  },
  // ── v2.1 Administrator-only items ──
  {
    label: 'Plant eligibility',
    to: '/app/admin/eligibility',
    icon: Leaf,
    description: 'Assess cement plant eligibility for simulated issuance',
    ready: true,
    group: 'admin',
    audiences: ['administrator'],
  },
  {
    label: 'Issuance batches',
    to: '/app/admin/batches',
    icon: PackageCheck,
    description: 'Create and manage simulated issuance batches',
    ready: true,
    group: 'admin',
    audiences: ['administrator'],
  },
  {
    label: 'Review fees',
    to: '/app/admin/fees',
    icon: ReceiptText,
    description: 'Configure and view review fee settings and snapshots',
    ready: true,
    group: 'admin',
    audiences: ['administrator'],
  },
  {
    label: 'Sale allocations',
    to: '/app/admin/allocations',
    icon: DollarSign,
    description: 'Simulated sale allocation records per batch',
    ready: true,
    group: 'admin',
    audiences: ['administrator'],
  },
]

/**
 * Filter nav items by active user role.
 * Maps UserRole → NavAudience for filtering.
 * Administrators always see everything.
 */
export function getNavItemsForRole(role: UserRole): NavItem[] {
  if (role === 'administrator') return navItems

  // Map role to audience keys (plant_operator stays plant_operator, etc.)
  const audienceKey: NavAudience = role === 'plant_operator' ? 'plant_operator' : role

  return navItems.filter((item) =>
    item.audiences.includes(audienceKey) ||
    item.audiences.includes('administrator')
  ).filter((item) => !item.audiences.every((a) => a === 'administrator'))
}

/**
 * Filter nav groups to only those that have visible items for a role.
 */
export function getNavGroupsForRole(role: UserRole): typeof navGroups {
  const items = getNavItemsForRole(role)
  const visibleGroupIds = new Set(items.map((item) => item.group))
  return navGroups.filter((group) => visibleGroupIds.has(group.id))
}

export const brand = {
  name: 'BIOTRACE',
  tagline: 'Traceable biomass. Measurable climate impact.',
  // BiotraceMark SVG component — imported directly in Sidebar, not passed here
  // to avoid circular icon-component coupling.
  Icon: Wheat, // Fallback only — Sidebar uses BiotraceMark directly
}
