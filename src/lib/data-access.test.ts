import { describe, expect, it } from 'vitest'
import { resolveDataMode } from './data-access'

describe('resolveDataMode', () => {
  it('allows explicit demo mode only outside production', () => {
    expect(resolveDataMode('demo', false, false)).toBe('demo')
    expect(resolveDataMode('demo', true, false)).toBe('demo')
    expect(resolveDataMode('demo', false, true)).toBe('configuration-error')
    expect(resolveDataMode('demo', true, true)).toBe('configuration-error')
  })

  it('never defaults to demo when the mode is unset', () => {
    expect(resolveDataMode('', false)).toBe('configuration-error')
    expect(resolveDataMode('', true)).toBe('supabase')
  })

  it('rejects Supabase mode without configuration and unknown modes', () => {
    expect(resolveDataMode('supabase', false)).toBe('configuration-error')
    expect(resolveDataMode('unexpected', true)).toBe('configuration-error')
  })
})
