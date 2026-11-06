import { getSupabaseClient } from '@/lib/supabase'
import type {
  Delivery,
  DeliveryStatus,
  EvidenceFile,
  PlantOption,
  ReviewDecision,
  ReviewDecisionType,
  StatusHistoryEntry,
  SupplierOption,
  UserRole,
} from '@/types'

export interface CreateDeliveryInput {
  supplierOrgId: string
  plantOrgId: string
  biomassType: string
  originLocation: string
  declaredQuantityT: number
  deliveryDate: string
  vehicleReference?: string
  notes?: string
  aggregatorOrgId?: string
  destinationFacilityId?: string
}

export interface ConfirmPlantDeliveryInput {
  deliveryId: string
  decision: 'confirmed' | 'disputed'
  measuredQuantityT: number
  disputeReason?: string
  facilityId?: string
}

export async function listApprovedPlants(): Promise<PlantOption[]> {
  const { data, error } = await getSupabaseClient()
    .from('organizations')
    .select('id, name, business_address')
    .eq('organization_type', 'cement_plant')
    .order('name', { ascending: true })

  if (error) {
    console.warn('Failed to fetch cement plants:', error)
    return []
  }

  return (data ?? []).map((org) => ({
    id: org.id,
    name: org.name,
    location: org.business_address ?? 'Plant Location',
  }))
}

export async function listApprovedSuppliers(): Promise<SupplierOption[]> {
  const { data, error } = await getSupabaseClient()
    .from('organizations')
    .select('id, name, business_address, organization_type')
    .in('organization_type', ['supplier', 'biomass_aggregator'])
    .order('name', { ascending: true })

  if (error) {
    console.warn('Failed to fetch suppliers:', error)
    return []
  }

  return (data ?? []).map((org) => ({
    id: org.id,
    name: org.name,
    location: org.business_address ?? 'Sourcing Region',
  }))
}

export async function listDeliveriesFromSupabase(): Promise<Delivery[]> {
  const client = getSupabaseClient()

  // 1. Fetch deliveries
  const { data: rows, error: deliveriesError } = await client
    .from('deliveries')
    .select('*')
    .order('created_at', { ascending: false })

  if (deliveriesError) {
    throw new Error(`Unable to fetch deliveries: ${deliveriesError.message}`)
  }

  if (!rows || rows.length === 0) return []

  const deliveryIds = rows.map((r) => r.id)

  // 2. Fetch related history, evidence, and reviews in parallel
  const [historyRes, evidenceRes, reviewsRes] = await Promise.all([
    client
      .from('delivery_status_history')
      .select('*')
      .in('delivery_id', deliveryIds)
      .order('created_at', { ascending: true }),
    client
      .from('evidence_files')
      .select('*')
      .in('delivery_id', deliveryIds)
      .order('created_at', { ascending: true }),
    client
      .from('review_decisions')
      .select('*')
      .in('delivery_id', deliveryIds)
      .order('created_at', { ascending: true }),
  ])

  // Group by delivery_id
  const historyMap = new Map<string, StatusHistoryEntry[]>()
  for (const h of historyRes.data ?? []) {
    const list = historyMap.get(h.delivery_id) ?? []
    list.push({
      id: h.id,
      fromStatus: (h.from_status as DeliveryStatus) || null,
      toStatus: h.to_status as DeliveryStatus,
      actorName: h.actor_name,
      actorRole: h.actor_role as UserRole,
      note: h.note,
      timestamp: h.created_at,
    })
    historyMap.set(h.delivery_id, list)
  }

  const evidenceMap = new Map<string, EvidenceFile[]>()
  for (const e of evidenceRes.data ?? []) {
    const list = evidenceMap.get(e.delivery_id) ?? []
    list.push({
      id: e.id,
      kind: e.kind as EvidenceFile['kind'],
      fileName: e.file_name,
      mimeType: e.mime_type,
      sizeBytes: e.size_bytes,
      previewUrl: '',
      uploadedAt: e.created_at,
      uploadedBy: e.uploaded_by ?? 'Participant',
      note: e.note ?? undefined,
    })
    evidenceMap.set(e.delivery_id, list)
  }

  const reviewsMap = new Map<string, ReviewDecision[]>()
  for (const r of reviewsRes.data ?? []) {
    const list = reviewsMap.get(r.delivery_id) ?? []
    list.push({
      id: r.id,
      deliveryId: r.delivery_id,
      reviewerName: r.reviewer_name,
      reviewerRole: r.reviewer_role as UserRole,
      decision: r.decision as ReviewDecisionType,
      note: r.note,
      timestamp: r.created_at,
    })
    reviewsMap.set(r.delivery_id, list)
  }

  return rows.map((r) => ({
    id: r.id,
    reference: r.reference,
    supplierId: r.supplier_org_id,
    supplierName: r.supplier_name,
    plantId: r.plant_org_id,
    plantName: r.plant_name,
    biomassType: r.biomass_type,
    originLocation: r.origin_location,
    declaredQuantityT: Number(r.declared_quantity_t),
    unit: 't' as const,
    deliveryDate: r.delivery_date,
    vehicleReference: r.vehicle_reference ?? '',
    notes: r.notes ?? '',
    measuredQuantityT: r.measured_quantity_t !== null ? Number(r.measured_quantity_t) : null,
    discrepancyNote: r.discrepancy_note ?? '',
    status: r.status as DeliveryStatus,
    evidence: evidenceMap.get(r.id) ?? [],
    history: historyMap.get(r.id) ?? [],
    reviews: reviewsMap.get(r.id) ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }))
}

export async function getDeliveryByIdFromSupabase(
  deliveryId: string,
): Promise<Delivery | undefined> {
  const deliveries = await listDeliveriesFromSupabase()
  return deliveries.find((d) => d.id === deliveryId)
}

export async function createDeliveryInSupabase(
  input: CreateDeliveryInput,
): Promise<string> {
  const { data, error } = await getSupabaseClient().rpc('create_biomass_delivery', {
    p_supplier_org_id: input.supplierOrgId,
    p_plant_org_id: input.plantOrgId,
    p_biomass_type: input.biomassType,
    p_origin_location: input.originLocation,
    p_declared_quantity_t: input.declaredQuantityT,
    p_delivery_date: input.deliveryDate,
    p_vehicle_reference: input.vehicleReference || null,
    p_notes: input.notes || null,
    p_aggregator_org_id: input.aggregatorOrgId || null,
    p_destination_facility_id: input.destinationFacilityId || null,
  })

  if (error) {
    throw new Error(`Failed to create delivery: ${error.message}`)
  }

  if (!data) {
    throw new Error('Delivery creation returned no delivery ID.')
  }

  return data
}

export async function confirmPlantDeliveryInSupabase(
  input: ConfirmPlantDeliveryInput,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc('confirm_plant_delivery', {
    p_delivery_id: input.deliveryId,
    p_decision: input.decision,
    p_measured_quantity_t: input.measuredQuantityT,
    p_dispute_reason: input.disputeReason || null,
    p_facility_id: input.facilityId || null,
  })

  if (error) {
    throw new Error(`Failed to record plant confirmation: ${error.message}`)
  }
}

export async function submitDeliveryForReviewInSupabase(
  deliveryId: string,
  note?: string,
): Promise<void> {
  const { error } = await getSupabaseClient().rpc('submit_delivery_for_review', {
    p_delivery_id: deliveryId,
    p_note: note || null,
  })

  if (error) {
    throw new Error(`Failed to submit delivery for review: ${error.message}`)
  }
}

