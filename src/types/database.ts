type Table<Row, Insert = Partial<Row>, Update = Partial<Insert>, Rel extends unknown[] = []> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: Rel
}

export interface Database {
  public: {
    Tables: {
      profiles: Table<{
        id: string
        full_name: string
        email: string
        role: string
        organization_id: string | null
        account_status: 'pending_email_verification' | 'active' | 'suspended'
        created_at: string
        updated_at: string
      }>
      organizations: Table<{
        id: string
        name: string
        organization_type: string
        registration_number: string | null
        contact_email: string | null
        phone: string | null
        business_address: string | null
        relevant_information: string | null
        created_at: string
        updated_at: string
      }>
      organization_memberships: Table<{
        id: string
        organization_id: string
        user_id: string
        role: string
        is_active: boolean
        created_at: string
      }>
      organization_verifications: Table<
        {
          id: string
          organization_id: string
          status: string
          submitted_by: string
          reviewed_by: string | null
          decision_reason: string | null
          submitted_at: string
          decided_at: string | null
        },
        Partial<{
          id: string
          organization_id: string
          status: string
          submitted_by: string
          reviewed_by: string | null
          decision_reason: string | null
          submitted_at: string
          decided_at: string | null
        }>,
        Partial<{
          id: string
          organization_id: string
          status: string
          submitted_by: string
          reviewed_by: string | null
          decision_reason: string | null
          submitted_at: string
          decided_at: string | null
        }>,
        [
          {
            foreignKeyName: "organization_verifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          }
        ]
      >
      organization_verification_documents: Table<{
        id: string
        verification_id: string
        document_type: string
        file_name: string
        mime_type: string
        size_bytes: number
        storage_path: string
        uploaded_by: string
        created_at: string
      }>
      facilities: Table<{
        id: string
        organization_id: string
        name: string
        address: string | null
        region: string | null
        created_at: string
        updated_at: string
      }>
      facility_memberships: Table<{
        id: string
        facility_id: string
        user_id: string
        is_active: boolean
        created_at: string
      }>
      reviewer_profiles: Table<{
        user_id: string
        organization_id: string
        accreditation_status: string
        accreditation_reference: string | null
        conflict_declaration_signed_at: string | null
        created_at: string
        updated_at: string
      }>
      reviewer_conflicts: Table<{
        id: string
        delivery_id: string
        reviewer_user_id: string
        reason: string
        disclosed_at: string
      }>
      projects: Table<{
        id: string
        organization_id: string
        name: string
        status: string
        buyer_visible: boolean
        created_at: string
        updated_at: string
      }>
      deliveries: Table<{
        id: string
        reference: string
        supplier_org_id: string
        supplier_name: string
        aggregator_org_id: string | null
        plant_org_id: string
        plant_name: string
        destination_facility_id: string | null
        biomass_type: string
        origin_location: string
        declared_quantity_t: number
        unit: string
        delivery_date: string
        vehicle_reference: string | null
        notes: string | null
        status: string
        measured_quantity_t: number | null
        discrepancy_note: string
        created_by: string | null
        created_at: string
        updated_at: string
      }>
      evidence_files: Table<{
        id: string
        delivery_id: string
        kind: string
        file_name: string
        mime_type: string
        size_bytes: number
        storage_path: string
        uploaded_by: string | null
        note: string | null
        created_at: string
        updated_at: string
      }>
      plant_confirmations: Table<{
        id: string
        delivery_id: string
        facility_id: string
        confirmed_by: string
        decision: string
        measured_quantity_t: number
        dispute_reason: string | null
        evidence_file_id: string | null
        created_at: string
      }>
      review_assignments: Table<{
        id: string
        delivery_id: string
        reviewer_user_id: string
        assigned_by: string
        status: string
        assigned_at: string
        completed_at: string | null
      }>
      reviews: Table<{
        id: string
        assignment_id: string
        delivery_id: string
        reviewer_user_id: string
        decision: string
        note: string
        created_at: string
      }>
      review_decisions: Table<{
        id: string
        delivery_id: string
        reviewer_user_id: string
        reviewer_name: string
        reviewer_role: string
        decision: string
        note: string
        created_at: string
      }>
      delivery_events: Table<{
        id: string
        delivery_id: string
        from_status: string | null
        to_status: string
        actor_user_id: string | null
        event_type: string
        note: string
        created_at: string
      }>
      delivery_status_history: Table<{
        id: string
        delivery_id: string
        from_status: string | null
        to_status: string
        actor_user_id: string | null
        actor_role: string
        actor_name: string
        note: string
        created_at: string
      }>
      audit_logs: Table<{
        id: string
        actor_user_id: string | null
        action: string
        entity_type: string
        entity_id: string
        before_state: Json | null
        after_state: Json | null
        metadata: Json
        created_at: string
      }>
      platform_admins: Table<{
        user_id: string
        granted_by: string | null
        granted_at: string
      }>
      plant_eligibility_files: Table<{
        id: string
        plant_org_id: string
        clinker_facility_exists: boolean | null
        baseline_fuel_mix: string | null
        first_alt_fuel_date: string | null
        investment_evidence: string | null
        baseline_biomass_fate: string | null
        baseline_fate_evidence: string | null
        status: string
        admin_note: string | null
        assessed_by: string | null
        assessed_at: string | null
        created_by: string | null
        created_at: string
        updated_at: string
      }>
      issuance_batches: Table<{
        id: string
        plant_org_id: string
        period_start: string
        period_end: string
        total_net_tco2e: number | null
        whole_credits: number | null
        rounding_remainder: number | null
        status: string
        issued_by: string | null
        issued_at: string | null
        created_by: string | null
        created_at: string
        updated_at: string
      }>
      issuance_batch_deliveries: Table<{
        id: string
        batch_id: string
        delivery_id: string
        snapshot_net_tco2e: number
        snapshot_measured_t: number
        snapshot_biomass_type: string
        snapshot_delivery_ref: string
        created_at: string
      }>
      review_fee_settings: Table<{
        id: string
        fee_amount: number
        currency: string
        effective_from: string
        set_by: string
        created_at: string
      }>
      review_fee_snapshots: Table<{
        id: string
        delivery_id: string
        review_id: string | null
        fee_setting_id: string | null
        fee_amount: number
        currency: string
        payer_org_id: string | null
        status: string
        snapshot_at: string
        created_at: string
      }>
      sale_allocation_records: Table<{
        id: string
        batch_id: string
        payee_type: string
        payee_org_id: string | null
        allocation_basis: string
        basis_value: number | null
        amount: number
        currency: string
        status: string
        created_by: string | null
        created_at: string
      }>
    }
    Views: Record<string, never>
    Functions: {
      register_organization: {
        Args: {
          p_name: string
          p_organization_type: string
          p_registration_number: string
          p_contact_email: string
          p_phone: string
          p_business_address: string
          p_relevant_information?: string | null
        }
        Returns: string
      }
      add_organization_member: {
        Args: {
          p_organization_id: string
          p_user_id: string
          p_role: string
        }
        Returns: string
      }
      review_organization_verification: {
        Args: {
          p_verification_id: string
          p_status: string
          p_decision_reason?: string | null
        }
        Returns: undefined
      }
      create_biomass_delivery: {
        Args: {
          p_supplier_org_id: string
          p_plant_org_id: string
          p_biomass_type: string
          p_origin_location: string
          p_declared_quantity_t: number
          p_delivery_date: string
          p_vehicle_reference?: string | null
          p_notes?: string | null
          p_aggregator_org_id?: string | null
          p_destination_facility_id?: string | null
        }
        Returns: string
      }
      confirm_plant_delivery: {
        Args: {
          p_delivery_id: string
          p_decision: string
          p_measured_quantity_t: number
          p_dispute_reason?: string | null
          p_facility_id?: string | null
        }
        Returns: undefined
      }
      submit_delivery_for_review: {
        Args: {
          p_delivery_id: string
          p_note?: string | null
        }
        Returns: undefined
      }
      assess_plant_eligibility: {
        Args: {
          p_plant_org_id: string
          p_status: string
          p_clinker_facility_exists?: boolean | null
          p_baseline_fuel_mix?: string | null
          p_first_alt_fuel_date?: string | null
          p_investment_evidence?: string | null
          p_baseline_biomass_fate?: string | null
          p_baseline_fate_evidence?: string | null
          p_admin_note?: string | null
        }
        Returns: string
      }
      create_issuance_batch: {
        Args: {
          p_plant_org_id: string
          p_period_start: string
          p_period_end: string
          p_delivery_ids: string[]
        }
        Returns: string
      }
      update_batch_snapshot: {
        Args: {
          p_batch_id: string
          p_delivery_id: string
          p_net_tco2e: number
        }
        Returns: undefined
      }
      issue_batch: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      set_review_fee: {
        Args: {
          p_fee_amount: number
          p_currency?: string
        }
        Returns: string
      }
      record_review: {
        Args: {
          p_delivery_id: string
          p_decision: string
          p_note: string
        }
        Returns: string
      }
      create_sale_allocations: {
        Args: {
          p_batch_id: string
          p_plant_amount: number
          p_platform_amount: number
          p_platform_fee_pct?: number
          p_per_supplier_amounts?: Json | null
        }
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
