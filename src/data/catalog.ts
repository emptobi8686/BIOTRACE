import type { PlantOption, SupplierOption } from '@/types'

export const BIOMASS_TYPES = [
  'Palm kernel shell',
  'Wood chips (sustainable residue)',
  'Cotton stalk bales',
  'Cocoa husk',
  'Rice husk',
  'Sawdust briquettes',
] as const

export const suppliers: SupplierOption[] = [
  {
    id: 'sup_ogun',
    name: 'Ogun Agro Residues Ltd',
    location: 'Ifo, Ogun State',
  },
  {
    id: 'sup_benue',
    name: 'Benue Sawdust Collective',
    location: 'Makurdi, Benue State',
  },
  {
    id: 'sup_kaduna',
    name: 'Kaduna Cotton Stalk Co-op',
    location: 'Zaria, Kaduna State',
  },
  {
    id: 'sup_cross',
    name: 'Cross River Cocoa Husk Hub',
    location: 'Ikom, Cross River State',
  },
]

export const plants: PlantOption[] = [
  {
    id: 'plt_ewekoro',
    name: 'Lafarge Ewekoro Plant (demo)',
    location: 'Ewekoro, Ogun State',
  },
  {
    id: 'plt_obajana',
    name: 'Dangote Obajana Plant (demo)',
    location: 'Obajana, Kogi State',
  },
  {
    id: 'plt_sokoto',
    name: 'BUA Sokoto Plant (demo)',
    location: 'Sokoto, Sokoto State',
  },
  {
    id: 'plt_mfamosing',
    name: 'Lafarge Mfamosing Plant (demo)',
    location: 'Mfamosing, Cross River State',
  },
  {
    id: 'plt_ibese',
    name: 'Dangote Ibese Plant (demo)',
    location: 'Ibese, Ogun State',
  },
]
