import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface SupabaseRuntimeConfig {
  url: string
  anonKey: string
  isConfigured: boolean
  configurationError: string | null
}

export function resolveSupabaseConfig(
  env: Record<string, string | undefined> = import.meta.env,
): SupabaseRuntimeConfig {
  const url = (env.VITE_SUPABASE_URL ?? '').trim()
  const anonKey = (env.VITE_SUPABASE_ANON_KEY ?? '').trim()
  let validUrl = false

  if (url) {
    try {
      const parsed = new URL(url)
      validUrl =
        (parsed.protocol === 'https:' ||
          (parsed.protocol === 'http:' &&
            (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1'))) &&
        parsed.username === '' &&
        parsed.password === ''
    } catch {
      validUrl = false
    }
  }
  const isConfigured = validUrl && Boolean(anonKey)

  return {
    url,
    anonKey,
    isConfigured,
    configurationError: isConfigured
      ? null
      : 'Supabase configuration is incomplete or invalid. Set VITE_SUPABASE_URL to an HTTPS Supabase URL (HTTP is allowed for localhost) and provide VITE_SUPABASE_ANON_KEY.',
  }
}

export const supabaseConfig = resolveSupabaseConfig()
export const isSupabaseConfigured = supabaseConfig.isConfigured

export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
  ? createClient<Database>(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      supabaseConfig.configurationError ?? 'The Supabase client is unavailable.',
    )
  }

  return supabase
}
