import { describe, expect, it } from 'vitest'
import { resolveSupabaseConfig } from './supabase'

describe('resolveSupabaseConfig', () => {
  it('treats empty values as unconfigured', () => {
    expect(
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: '',
        VITE_SUPABASE_ANON_KEY: '',
      }),
    ).toMatchObject({
      url: '',
      anonKey: '',
      isConfigured: false,
    })
  })

  it('treats complete values as configured', () => {
    expect(
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      }),
    ).toMatchObject({
      url: 'http://127.0.0.1:54321',
      anonKey: 'test-anon-key',
      isConfigured: true,
    })
  })
})
