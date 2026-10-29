import type {
  ActivityEvent,
  DemoUser,
  KpiMetric,
  SampleDelivery,
} from '@/types'

/** Clearly labelled demo data for Milestone 1 — not live operational records. */
export const DEMO_BANNER =
  'Sample data for demonstration. Values are illustrative and not certified carbon credits.'

export const currentUser: DemoUser = {
  id: 'usr_demo_admin',
  name: 'Adaeze Okonkwo',
  email: 'adaeze.okonkwo@biotrace.demo',
  role: 'administrator',
  organization: 'BIOTRACE Demo Ops',
}

export const dashboardKpis: KpiMetric[] = [
  {
    id: 'biomass-delivered',
    label: 'Biomass delivered',
    value: '1,248 t',
    helper: 'Across 18 sample deliveries (Q3 2026)',
    impactLabel: 'estimated',
    trend: '+12% vs prior period',
  },
  {
    id: 'awaiting-confirmation',
    label: 'Awaiting plant confirmation',
    value: '4',
    helper: 'Declared weight not yet reconciled',
    impactLabel: 'estimated',
  },
  {
    id: 'awaiting-review',
    label: 'Awaiting independent review',
    value: '6',
    helper: 'Evidence packages queued for reviewers',
    impactLabel: 'estimated',
  },
  {
    id: 'emissions-estimate',
    label: 'Estimated emissions reduction',
    value: '892 tCO₂e',
    helper: 'Illustrative; methodology inputs incomplete',
    impactLabel: 'estimated',
  },
  {
    id: 'issued-credits',
    label: 'Formally issued credits',
    value: '0 tCO₂e',
    helper: 'No registry issuance in this prototype',
    impactLabel: 'issued',
  },
  {
    id: 'sim-marketplace',
    label: 'Simulated marketplace volume',
    value: '₦4.2M',
    helper: 'Demo orders only — no real payments',
    impactLabel: 'simulated',
  },
]

export const sampleDeliveries: SampleDelivery[] = [
  {
    id: 'del_001',
    reference: 'BT-DEL-2026-0041',
    supplier: 'Ogun Agro Residues Ltd',
    plant: 'Lafarge Ewekoro Plant (demo)',
    biomassType: 'Palm kernel shell',
    declaredQuantityT: 42.5,
    measuredQuantityT: 41.8,
    status: 'awaiting_review',
    deliveryDate: '2026-10-18',
    location: 'Ifo, Ogun State',
  },
  {
    id: 'del_002',
    reference: 'BT-DEL-2026-0042',
    supplier: 'Benue Sawdust Collective',
    plant: 'Dangote Obajana Plant (demo)',
    biomassType: 'Wood chips (sustainable residue)',
    declaredQuantityT: 38.0,
    measuredQuantityT: null,
    status: 'pending_plant_confirmation',
    deliveryDate: '2026-10-21',
    location: 'Makurdi, Benue State',
  },
  {
    id: 'del_003',
    reference: 'BT-DEL-2026-0038',
    supplier: 'Kaduna Cotton Stalk Co-op',
    plant: 'BUA Sokoto Plant (demo)',
    biomassType: 'Cotton stalk bales',
    declaredQuantityT: 55.2,
    measuredQuantityT: 54.9,
    status: 'reviewed',
    deliveryDate: '2026-10-12',
    location: 'Zaria, Kaduna State',
  },
  {
    id: 'del_004',
    reference: 'BT-DEL-2026-0039',
    supplier: 'Cross River Cocoa Husk Hub',
    plant: 'Lafarge Mfamosing Plant (demo)',
    biomassType: 'Cocoa husk',
    declaredQuantityT: 28.0,
    measuredQuantityT: 26.4,
    status: 'corrections_requested',
    deliveryDate: '2026-10-14',
    location: 'Ikom, Cross River State',
  },
  {
    id: 'del_005',
    reference: 'BT-DEL-2026-0040',
    supplier: 'Ogun Agro Residues Ltd',
    plant: 'Dangote Ibese Plant (demo)',
    biomassType: 'Rice husk',
    declaredQuantityT: 31.5,
    measuredQuantityT: 31.5,
    status: 'confirmed',
    deliveryDate: '2026-10-16',
    location: 'Abeokuta, Ogun State',
  },
]

export const recentActivity: ActivityEvent[] = [
  {
    id: 'act_1',
    title: 'Plant weight confirmed',
    detail: 'BT-DEL-2026-0041 measured at 41.8 t (declared 42.5 t)',
    timestamp: '2026-10-19T09:14:00+01:00',
    actor: 'Plant operator · Ewekoro',
  },
  {
    id: 'act_2',
    title: 'Correction requested',
    detail: 'Missing weighing-ticket scan on BT-DEL-2026-0039',
    timestamp: '2026-10-17T16:40:00+01:00',
    actor: 'Independent reviewer',
  },
  {
    id: 'act_3',
    title: 'Delivery submitted',
    detail: 'Benue Sawdust Collective uploaded evidence for BT-DEL-2026-0042',
    timestamp: '2026-10-21T11:05:00+01:00',
    actor: 'Supplier',
  },
  {
    id: 'act_4',
    title: 'Review recorded',
    detail: 'BT-DEL-2026-0038 approved for evidence completeness (not issuance)',
    timestamp: '2026-10-15T13:22:00+01:00',
    actor: 'Independent reviewer',
  },
]
