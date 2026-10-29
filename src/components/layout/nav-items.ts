import type { LucideIcon } from 'lucide-react'
import {
  ClipboardCheck,
  Factory,
  LayoutDashboard,
  Leaf,
  Scale,
  ShoppingCart,
  Truck,
} from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  description: string
  ready: boolean
}

export const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    to: '/',
    icon: LayoutDashboard,
    description: 'Overview of deliveries, impact and demo commercial metrics',
    ready: true,
  },
  {
    label: 'Deliveries',
    to: '/deliveries',
    icon: Truck,
    description: 'Biomass delivery submissions and plant confirmations',
    ready: true,
  },
  {
    label: 'Plant weighing',
    to: '/plant',
    icon: Scale,
    description: 'Measured weights and weighing-ticket evidence',
    ready: false,
  },
  {
    label: 'Review & MRV',
    to: '/review',
    icon: ClipboardCheck,
    description: 'Independent review and transparent calculations',
    ready: true,
  },
  {
    label: 'Projects',
    to: '/projects',
    icon: Factory,
    description: 'Cement plant projects and methodology inputs',
    ready: false,
  },
  {
    label: 'Marketplace',
    to: '/marketplace',
    icon: ShoppingCart,
    description: 'Simulated eligible inventory and demo orders',
    ready: false,
  },
]

export const brand = {
  name: 'BIOTRACE',
  tagline: 'Traceable biomass. Measurable climate impact.',
  Icon: Leaf,
}
