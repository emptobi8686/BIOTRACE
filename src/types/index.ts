export type UserRole =
  | 'administrator'
  | 'supplier'
  | 'plant_operator'
  | 'reviewer'
  | 'buyer'

export type DeliveryStatus =
  | 'pending_plant_confirmation'
  | 'confirmed'
  | 'disputed'
  | 'awaiting_review'
  | 'corrections_requested'
  | 'reviewed'
  | 'rejected'

export type ImpactLabel =
  | 'estimated'
  | 'reviewed'
  | 'verified'
  | 'issued'
  | 'simulated'

export type EvidenceKind =
  | 'delivery_note'
  | 'weighing_ticket'
  | 'photo'
  | 'transport_doc'
  | 'other'

export type QuantityUnit = 't'

export interface DemoUser {
  id: string
  name: string
  email: string
  role: UserRole
  organization: string
}

export interface PlantOption {
  id: string
  name: string
  location: string
}

export interface SupplierOption {
  id: string
  name: string
  location: string
}

export interface EvidenceFile {
  id: string
  kind: EvidenceKind
  fileName: string
  mimeType: string
  sizeBytes: number
  /** Local object URL for demo preview only — not cloud storage. */
  previewUrl: string
  uploadedAt: string
  uploadedBy: string
  note?: string
}

export interface StatusHistoryEntry {
  id: string
  fromStatus: DeliveryStatus | null
  toStatus: DeliveryStatus
  actorName: string
  actorRole: UserRole
  note: string
  timestamp: string
}

export interface Delivery {
  id: string
  reference: string
  supplierId: string
  supplierName: string
  plantId: string
  plantName: string
  biomassType: string
  originLocation: string
  declaredQuantityT: number
  unit: QuantityUnit
  deliveryDate: string
  vehicleReference: string
  notes: string
  measuredQuantityT: number | null
  discrepancyNote: string
  status: DeliveryStatus
  evidence: EvidenceFile[]
  history: StatusHistoryEntry[]
  reviews: ReviewDecision[]
  createdAt: string
  updatedAt: string
}

/** Compact row shape used by dashboard tables. */
export interface SampleDelivery {
  id: string
  reference: string
  supplier: string
  plant: string
  biomassType: string
  declaredQuantityT: number
  measuredQuantityT: number | null
  status: DeliveryStatus
  deliveryDate: string
  location: string
}

export interface KpiMetric {
  id: string
  label: string
  value: string
  helper: string
  impactLabel: ImpactLabel
  trend?: string
}

export interface ActivityEvent {
  id: string
  title: string
  detail: string
  timestamp: string
  actor: string
}

export type ReviewDecisionType = 'approved' | 'corrections_requested' | 'rejected'

export interface ReviewDecision {
  id: string
  deliveryId: string
  reviewerName: string
  reviewerRole: UserRole
  decision: ReviewDecisionType
  note: string
  timestamp: string
}

export interface CreateDeliveryInput {
  supplierId: string
  plantId: string
  biomassType: string
  originLocation: string
  declaredQuantityT: number
  deliveryDate: string
  vehicleReference: string
  notes: string
  evidence: EvidenceFile[]
}

export interface PlantConfirmationInput {
  measuredQuantityT: number
  decision: 'confirm' | 'dispute'
  discrepancyNote: string
  sendToReview: boolean
  weighingTicket?: EvidenceFile
}
