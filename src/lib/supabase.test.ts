import { describe, expect, it } from 'vitest'
import { resolveSupabaseConfig } from './supabase'

describe('resolveSupabaseConfig', () => {
  it('treats empty values as unconfigured', () => {
    const config = resolveSupabaseConfig({
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    })

    expect(config).toMatchObject({
      url: '',
      anonKey: '',
      isConfigured: false,
    })
    expect(config.configurationError).toContain('Supabase configuration is incomplete')
  })

  it('accepts a complete HTTPS Supabase configuration', () => {
    expect(
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: 'https://project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      }),
    ).toMatchObject({
      url: 'https://project.supabase.co',
      anonKey: 'test-anon-key',
      isConfigured: true,
      configurationError: null,
    })
  })

  it('allows HTTP only for local development URLs', () => {
    expect(
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      }).isConfigured,
    ).toBe(true)
    expect(
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: 'http://project.example',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      }).isConfigured,
    ).toBe(false)
  })

  it('rejects malformed URLs and URLs containing credentials', () => {
    expect(
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: 'not a URL',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      }).isConfigured,
    ).toBe(false)
    expect(
      resolveSupabaseConfig({
        VITE_SUPABASE_URL: 'https://user:password@project.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      }).isConfigured,
    ).toBe(false)
  })
})
