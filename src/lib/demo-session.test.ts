import { describe, expect, it } from 'vitest'
import { DEMO_ROLE_ORDER, getDemoUserByRole, isDemoRole } from './demo-session'

describe('demo-session helpers', () => {
  it('returns the expected demo user for each supported role', () => {
    expect(getDemoUserByRole('supplier').role).toBe('supplier')
    expect(getDemoUserByRole('plant_operator').role).toBe('plant_operator')
    expect(getDemoUserByRole('reviewer').role).toBe('reviewer')
    expect(getDemoUserByRole('buyer').role).toBe('buyer')
    expect(getDemoUserByRole('administrator').role).toBe('administrator')
  })

  it('recognizes the five BIOTRACE roles and keeps them in the expected order', () => {
    expect(DEMO_ROLE_ORDER).toEqual([
      'administrator',
      'supplier',
      'plant_operator',
      'reviewer',
      'buyer',
    ])
    for (const role of DEMO_ROLE_ORDER) {
      expect(isDemoRole(role)).toBe(true)
    }
  })
})
