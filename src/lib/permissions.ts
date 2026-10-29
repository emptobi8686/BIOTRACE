/**
 * BIOTRACE — Role-Permission Matrix and Status-Transition Rules
 *
 * This module is the single source of truth for:
 *   1. What each role is allowed to do (permission checks).
 *   2. Which delivery status transitions are allowed and by whom.
 *
 * IMPORTANT
 * ─────────
 * These rules are enforced in the frontend store as a defense-in-depth measure.
 * They MUST also be enforced server-side (Supabase RLS + Edge Functions) once
 * the backend is connected. Never treat a client-side check as a security boundary.
 *
 * ROLES (match UserRole in src/types/index.ts)
 * ──────────────────────────────────────────────
 * administrator   – BIOTRACE platform admin
 * supplier        – Biomass supplier organisation
 * plant_operator  – Cement plant receiving biomass
 * reviewer        – Independent third-party reviewer
 * buyer           – Carbon credit buyer / observer
 */

import type { DeliveryStatus, UserRole } from '@/types'

// ─── Permission actions ───────────────────────────────────────────────────────

/**
 * Every discrete action that can be performed on a delivery or review.
 * Permissions are checked against these action names.
 */
export type DeliveryAction =
  | 'delivery:create'         // Submit a new delivery record
  | 'delivery:view_own'       // View deliveries submitted by own org
  | 'delivery:view_assigned'  // View deliveries assigned to own plant
  | 'delivery:view_all'       // View all deliveries across all orgs
  | 'delivery:confirm_weight' // Record measured weight (plant only)
  | 'delivery:dispute'        // Dispute a delivery (plant only)
  | 'delivery:view_evidence'  // View attached evidence files
  | 'review:create'           // Record a review decision
  | 'review:view'             // View review decisions and notes
  | 'review:view_all'         // View all review decisions (admin)
  | 'mrv:view'                // View illustrative MRV calculation

/**
 * Role-permission matrix.
 *
 * Each role maps to the set of actions it is permitted to perform.
 * Organization-scoping (e.g. a supplier seeing only their own deliveries)
 * is enforced separately via `isWithinOrgScope` and Supabase RLS.
 */
export const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<DeliveryAction>> = {
  administrator: new Set<DeliveryAction>([
    'delivery:view_all',
    'delivery:view_evidence',
    'review:view_all',
    'mrv:view',
    // Admins do NOT submit deliveries or record plant weights — those are
    // operational actions belonging to specific participant roles.
  ]),

  supplier: new Set<DeliveryAction>([
    'delivery:create',
    'delivery:view_own',
    'delivery:view_evidence',
    // Suppliers cannot confirm weights, dispute, review, or see other orgs' deliveries.
  ]),

  plant_operator: new Set<DeliveryAction>([
    'delivery:view_assigned',
    'delivery:confirm_weight',
    'delivery:dispute',
    'delivery:view_evidence',
    // Plant operators cannot submit deliveries or record review decisions.
  ]),

  reviewer: new Set<DeliveryAction>([
    'delivery:view_all',    // Reviewers must see the full delivery to check it
    'delivery:view_evidence',
    'review:create',
    'review:view',
    'mrv:view',
    // Reviewers cannot submit deliveries or confirm plant weights.
    // Preventing self-review is enforced separately (see canReviewDelivery).
  ]),

  buyer: new Set<DeliveryAction>([
    'mrv:view',
    // Buyers have very limited access. They can browse project info and MRV
    // summaries but cannot view individual delivery records or evidence.
    // Full marketplace access is defined in a later milestone.
  ]),
}

/**
 * Check whether a role has permission to perform an action.
 *
 * @example
 *   hasPermission('supplier', 'delivery:create')   // true
 *   hasPermission('buyer',    'delivery:create')   // false
 */
export function hasPermission(role: UserRole, action: DeliveryAction): boolean {
  return ROLE_PERMISSIONS[role].has(action)
}

// ─── Organisation-scope guard ─────────────────────────────────────────────────

/**
 * Returns true if the actor's organisation is within scope to access the record.
 *
 * This is a simplified client-side guard. The real enforcement lives in
 * Supabase RLS policies (see supabase/migrations/001_initial_schema.sql).
 *
 * Rules:
 *  - Administrators and reviewers can access all organisations.
 *  - Suppliers can only access records belonging to their own organisation.
 *  - Plant operators can only access deliveries assigned to their plant.
 *  - Buyers have no organisation-scoped access to individual deliveries.
 */
export function isWithinOrgScope(
  role: UserRole,
  actorOrgId: string,
  recordOrgId: string,
): boolean {
  if (role === 'administrator' || role === 'reviewer') return true
  if (role === 'buyer') return false
  return actorOrgId === recordOrgId
}

// ─── Self-review guard ────────────────────────────────────────────────────────

/**
 * Prevents a reviewer from approving a delivery that their own organisation
 * submitted. In the demo model, we compare organisation IDs. In the real
 * backend this is enforced at the database level.
 *
 * Returns true if the review IS allowed (i.e. no conflict of interest).
 */
export function canReviewDelivery(
  reviewerOrgId: string,
  deliverySupplierOrgId: string,
): boolean {
  return reviewerOrgId !== deliverySupplierOrgId
}

// ─── Status-transition rules ──────────────────────────────────────────────────

/**
 * Full list of allowed status transitions.
 *
 * Format: { from: DeliveryStatus | null, to: DeliveryStatus, by: UserRole[] }
 *
 * `from: null` means the initial creation of a delivery record.
 *
 * Assumptions documented here:
 * - Only plant operators can confirm or dispute deliveries.
 * - Only reviewers can move a delivery into reviewed, corrections_requested,
 *   or rejected from the review queue.
 * - A delivery that is `confirmed` must be explicitly forwarded to review
 *   by a plant operator (already handled in PlantConfirmationPage).
 * - A `disputed` delivery can be re-submitted after correction — the supplier
 *   moves it back to pending_plant_confirmation.
 * - An `rejected` delivery is terminal; no further transitions are allowed.
 */
export interface AllowedTransition {
  from: DeliveryStatus | null
  to: DeliveryStatus
  by: UserRole[]
  note: string
}

export const ALLOWED_TRANSITIONS: AllowedTransition[] = [
  // ── Initial creation ──────────────────────────────────────────────────────
  {
    from: null,
    to: 'pending_plant_confirmation',
    by: ['supplier', 'administrator'],
    note: 'Supplier submits a new delivery.',
  },

  // ── Plant confirmation ────────────────────────────────────────────────────
  {
    from: 'pending_plant_confirmation',
    to: 'confirmed',
    by: ['plant_operator', 'administrator'],
    note: 'Plant records measured weight and confirms delivery without sending to review.',
  },
  {
    from: 'pending_plant_confirmation',
    to: 'awaiting_review',
    by: ['plant_operator', 'administrator'],
    note: 'Plant confirms weight and forwards delivery for independent review.',
  },
  {
    from: 'pending_plant_confirmation',
    to: 'disputed',
    by: ['plant_operator', 'administrator'],
    note: 'Plant disputes the delivery (e.g. significant weight discrepancy).',
  },

  // ── Confirmed → review (plant can forward later) ──────────────────────────
  {
    from: 'confirmed',
    to: 'awaiting_review',
    by: ['plant_operator', 'administrator'],
    note: 'Plant operator forwards a previously confirmed delivery for review.',
  },

  // ── Dispute resolution ────────────────────────────────────────────────────
  {
    from: 'disputed',
    to: 'pending_plant_confirmation',
    by: ['supplier', 'administrator'],
    note: 'Supplier resubmits after resolving the disputed quantity.',
  },

  // ── Review queue → reviewer decision ─────────────────────────────────────
  {
    from: 'awaiting_review',
    to: 'reviewed',
    by: ['reviewer', 'administrator'],
    note: 'Reviewer approves the evidence package.',
  },
  {
    from: 'awaiting_review',
    to: 'corrections_requested',
    by: ['reviewer', 'administrator'],
    note: 'Reviewer requests corrections before approval.',
  },
  {
    from: 'awaiting_review',
    to: 'rejected',
    by: ['reviewer', 'administrator'],
    note: 'Reviewer rejects the delivery.',
  },

  // ── Corrections loop ──────────────────────────────────────────────────────
  {
    from: 'corrections_requested',
    to: 'awaiting_review',
    by: ['supplier', 'plant_operator', 'administrator'],
    note: 'Supplier or plant re-submits after addressing correction requests.',
  },
  {
    from: 'corrections_requested',
    to: 'reviewed',
    by: ['reviewer', 'administrator'],
    note: 'Reviewer approves after corrections have been made.',
  },
  {
    from: 'corrections_requested',
    to: 'rejected',
    by: ['reviewer', 'administrator'],
    note: 'Reviewer rejects after corrections are still insufficient.',
  },
]

// ─── Transition guard ─────────────────────────────────────────────────────────

export interface TransitionCheckResult {
  allowed: boolean
  reason: string
}

/**
 * Check whether a status transition is permitted for a given actor role.
 *
 * @param from   Current status (null for initial creation).
 * @param to     Desired new status.
 * @param role   Role of the actor attempting the transition.
 *
 * @returns { allowed: boolean, reason: string }
 *
 * @example
 *   checkTransition('pending_plant_confirmation', 'confirmed', 'plant_operator')
 *   // { allowed: true, reason: 'Plant records measured weight…' }
 *
 *   checkTransition('reviewed', 'confirmed', 'supplier')
 *   // { allowed: false, reason: 'No rule permits this transition.' }
 */
export function checkTransition(
  from: DeliveryStatus | null,
  to: DeliveryStatus,
  role: UserRole,
): TransitionCheckResult {
  const match = ALLOWED_TRANSITIONS.find(
    (t) => t.from === from && t.to === to,
  )

  if (!match) {
    return {
      allowed: false,
      reason: `No rule permits a transition from "${from ?? 'initial'}" to "${to}".`,
    }
  }

  if (!match.by.includes(role)) {
    return {
      allowed: false,
      reason:
        `Role "${role}" is not permitted to move a delivery from ` +
        `"${from ?? 'initial'}" to "${to}". ` +
        `Permitted roles: ${match.by.join(', ')}.`,
    }
  }

  return { allowed: true, reason: match.note }
}

// ─── Convenience label helpers ────────────────────────────────────────────────

/** Human-readable action label for UI display. */
export function actionLabel(action: DeliveryAction): string {
  const map: Record<DeliveryAction, string> = {
    'delivery:create': 'Submit a delivery',
    'delivery:view_own': 'View own deliveries',
    'delivery:view_assigned': 'View assigned deliveries',
    'delivery:view_all': 'View all deliveries',
    'delivery:confirm_weight': 'Record measured weight',
    'delivery:dispute': 'Dispute a delivery',
    'delivery:view_evidence': 'View evidence files',
    'review:create': 'Record a review decision',
    'review:view': 'View review decisions',
    'review:view_all': 'View all review decisions',
    'mrv:view': 'View climate calculation',
  }
  return map[action]
}
