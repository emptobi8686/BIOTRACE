/**
 * Unit tests for src/lib/permissions.ts
 *
 * Run with:  npx vitest run
 * Watch:     npx vitest
 *
 * These tests verify the permission matrix and status-transition guard
 * without requiring a browser, database, or Supabase connection.
 */
import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  checkTransition,
  canReviewDelivery,
  isWithinOrgScope,
  ALLOWED_TRANSITIONS,
  ROLE_PERMISSIONS,
} from './permissions'
import type { DeliveryStatus, UserRole } from '@/types'

// ─── hasPermission ─────────────────────────────────────────────────────────────

describe('hasPermission', () => {
  it('allows a supplier to create deliveries', () => {
    expect(hasPermission('supplier', 'delivery:create')).toBe(true)
  })

  it('prevents a buyer from creating deliveries', () => {
    expect(hasPermission('buyer', 'delivery:create')).toBe(false)
  })

  it('prevents a plant operator from creating deliveries', () => {
    expect(hasPermission('plant_operator', 'delivery:create')).toBe(false)
  })

  it('allows a plant operator to confirm weight', () => {
    expect(hasPermission('plant_operator', 'delivery:confirm_weight')).toBe(true)
  })

  it('prevents a supplier from confirming weight', () => {
    expect(hasPermission('supplier', 'delivery:confirm_weight')).toBe(false)
  })

  it('prevents a reviewer from confirming weight', () => {
    expect(hasPermission('reviewer', 'delivery:confirm_weight')).toBe(false)
  })

  it('allows a reviewer to create review decisions', () => {
    expect(hasPermission('reviewer', 'review:create')).toBe(true)
  })

  it('prevents a supplier from creating review decisions', () => {
    expect(hasPermission('supplier', 'review:create')).toBe(false)
  })

  it('prevents a plant operator from creating review decisions', () => {
    expect(hasPermission('plant_operator', 'review:create')).toBe(false)
  })

  it('prevents a buyer from creating review decisions', () => {
    expect(hasPermission('buyer', 'review:create')).toBe(false)
  })

  it('allows a reviewer to view MRV', () => {
    expect(hasPermission('reviewer', 'mrv:view')).toBe(true)
  })

  it('allows an administrator to view all deliveries', () => {
    expect(hasPermission('administrator', 'delivery:view_all')).toBe(true)
  })

  it('prevents an administrator from submitting deliveries', () => {
    // Admins manage the platform, they do not submit operational records
    expect(hasPermission('administrator', 'delivery:create')).toBe(false)
  })

  it('prevents an administrator from confirming plant weights', () => {
    expect(hasPermission('administrator', 'delivery:confirm_weight')).toBe(false)
  })

  it('every role has at least one permission', () => {
    const roles: UserRole[] = [
      'administrator',
      'supplier',
      'plant_operator',
      'reviewer',
      'buyer',
    ]
    for (const role of roles) {
      expect(ROLE_PERMISSIONS[role].size).toBeGreaterThan(0)
    }
  })
})

// ─── checkTransition ───────────────────────────────────────────────────────────

describe('checkTransition — valid transitions', () => {
  it('supplier can create a delivery (null → pending_plant_confirmation)', () => {
    const result = checkTransition(null, 'pending_plant_confirmation', 'supplier')
    expect(result.allowed).toBe(true)
  })

  it('plant_operator can confirm weight (pending → confirmed)', () => {
    const result = checkTransition(
      'pending_plant_confirmation',
      'confirmed',
      'plant_operator',
    )
    expect(result.allowed).toBe(true)
  })

  it('plant_operator can send confirmed delivery to review', () => {
    const result = checkTransition('confirmed', 'awaiting_review', 'plant_operator')
    expect(result.allowed).toBe(true)
  })

  it('plant_operator can dispute a delivery', () => {
    const result = checkTransition(
      'pending_plant_confirmation',
      'disputed',
      'plant_operator',
    )
    expect(result.allowed).toBe(true)
  })

  it('reviewer can approve (awaiting_review → reviewed)', () => {
    const result = checkTransition('awaiting_review', 'reviewed', 'reviewer')
    expect(result.allowed).toBe(true)
  })

  it('reviewer can request corrections (awaiting_review → corrections_requested)', () => {
    const result = checkTransition(
      'awaiting_review',
      'corrections_requested',
      'reviewer',
    )
    expect(result.allowed).toBe(true)
  })

  it('reviewer can reject (awaiting_review → rejected)', () => {
    const result = checkTransition('awaiting_review', 'rejected', 'reviewer')
    expect(result.allowed).toBe(true)
  })

  it('reviewer can approve from corrections_requested', () => {
    const result = checkTransition('corrections_requested', 'reviewed', 'reviewer')
    expect(result.allowed).toBe(true)
  })

  it('supplier can resubmit a disputed delivery', () => {
    const result = checkTransition(
      'disputed',
      'pending_plant_confirmation',
      'supplier',
    )
    expect(result.allowed).toBe(true)
  })

  it('supplier can resubmit after corrections requested', () => {
    const result = checkTransition(
      'corrections_requested',
      'awaiting_review',
      'supplier',
    )
    expect(result.allowed).toBe(true)
  })

  it('administrator can perform any defined transition', () => {
    // Spot-check three transitions
    expect(checkTransition(null, 'pending_plant_confirmation', 'administrator').allowed).toBe(true)
    expect(checkTransition('awaiting_review', 'reviewed', 'administrator').allowed).toBe(true)
    expect(checkTransition('pending_plant_confirmation', 'disputed', 'administrator').allowed).toBe(true)
  })
})

describe('checkTransition — invalid transitions (wrong role)', () => {
  it('supplier cannot confirm weight', () => {
    const result = checkTransition(
      'pending_plant_confirmation',
      'confirmed',
      'supplier',
    )
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/supplier/)
  })

  it('supplier cannot approve a review', () => {
    const result = checkTransition('awaiting_review', 'reviewed', 'supplier')
    expect(result.allowed).toBe(false)
  })

  it('plant_operator cannot approve a review', () => {
    const result = checkTransition('awaiting_review', 'reviewed', 'plant_operator')
    expect(result.allowed).toBe(false)
  })

  it('buyer cannot perform any transition', () => {
    const result = checkTransition(null, 'pending_plant_confirmation', 'buyer')
    expect(result.allowed).toBe(false)
  })

  it('reviewer cannot confirm weight', () => {
    const result = checkTransition(
      'pending_plant_confirmation',
      'confirmed',
      'reviewer',
    )
    expect(result.allowed).toBe(false)
  })
})

describe('checkTransition — non-existent transitions', () => {
  it('reviewed is terminal — no further transitions allowed', () => {
    const toStatuses: DeliveryStatus[] = [
      'pending_plant_confirmation',
      'confirmed',
      'disputed',
      'awaiting_review',
      'corrections_requested',
      'rejected',
    ]
    for (const to of toStatuses) {
      const result = checkTransition('reviewed', to, 'administrator')
      expect(result.allowed).toBe(false)
    }
  })

  it('rejected is terminal — no further transitions allowed', () => {
    const toStatuses: DeliveryStatus[] = [
      'pending_plant_confirmation',
      'confirmed',
      'disputed',
      'awaiting_review',
      'corrections_requested',
      'reviewed',
    ]
    for (const to of toStatuses) {
      const result = checkTransition('rejected', to, 'administrator')
      expect(result.allowed).toBe(false)
    }
  })

  it('returns a descriptive reason when no rule exists', () => {
    const result = checkTransition('confirmed', 'rejected', 'administrator')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/No rule permits/)
  })

  it('returns a descriptive reason when role is wrong', () => {
    const result = checkTransition('awaiting_review', 'reviewed', 'supplier')
    expect(result.allowed).toBe(false)
    expect(result.reason).toMatch(/supplier/)
    expect(result.reason).toMatch(/reviewer/)
  })
})

describe('checkTransition — transition table completeness', () => {
  it('every transition rule references valid statuses', () => {
    const validStatuses = new Set<DeliveryStatus | null>([
      null,
      'pending_plant_confirmation',
      'confirmed',
      'disputed',
      'awaiting_review',
      'corrections_requested',
      'reviewed',
      'rejected',
    ])
    for (const t of ALLOWED_TRANSITIONS) {
      expect(validStatuses.has(t.from)).toBe(true)
      expect(validStatuses.has(t.to)).toBe(true)
    }
  })

  it('every transition rule references valid roles', () => {
    const validRoles = new Set<UserRole>([
      'administrator',
      'supplier',
      'plant_operator',
      'reviewer',
      'buyer',
    ])
    for (const t of ALLOWED_TRANSITIONS) {
      for (const role of t.by) {
        expect(validRoles.has(role)).toBe(true)
      }
    }
  })
})

// ─── canReviewDelivery ─────────────────────────────────────────────────────────

describe('canReviewDelivery', () => {
  it('allows review when reviewer org differs from supplier org', () => {
    expect(canReviewDelivery('org_mrv_desk', 'org_ogun_agro')).toBe(true)
  })

  it('blocks review when reviewer and supplier are the same org', () => {
    expect(canReviewDelivery('org_same', 'org_same')).toBe(false)
  })
})

// ─── isWithinOrgScope ─────────────────────────────────────────────────────────

describe('isWithinOrgScope', () => {
  it('administrator can access any org', () => {
    expect(isWithinOrgScope('administrator', 'org_a', 'org_b')).toBe(true)
  })

  it('reviewer can access any org', () => {
    expect(isWithinOrgScope('reviewer', 'org_a', 'org_b')).toBe(true)
  })

  it('supplier can only access own org', () => {
    expect(isWithinOrgScope('supplier', 'org_a', 'org_a')).toBe(true)
    expect(isWithinOrgScope('supplier', 'org_a', 'org_b')).toBe(false)
  })

  it('plant_operator can only access own org', () => {
    expect(isWithinOrgScope('plant_operator', 'org_plant', 'org_plant')).toBe(true)
    expect(isWithinOrgScope('plant_operator', 'org_plant', 'org_other')).toBe(false)
  })

  it('buyer cannot access any individual delivery org', () => {
    expect(isWithinOrgScope('buyer', 'org_a', 'org_a')).toBe(false)
  })
})
