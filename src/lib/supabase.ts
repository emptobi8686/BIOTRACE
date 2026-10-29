export interface SupabaseRuntimeConfig {
  url: string
  anonKey: string
  isConfigured: boolean
}

export function resolveSupabaseConfig(
  env: Record<string, string | undefined> = import.meta.env,
): SupabaseRuntimeConfig {
  const url = (env.VITE_SUPABASE_URL ?? '').trim()
  const anonKey = (env.VITE_SUPABASE_ANON_KEY ?? '').trim()

  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  }
}

export const supabaseConfig = resolveSupabaseConfig()
export const isSupabaseConfigured = supabaseConfig.isConfigured

export function getSupabaseUrl(): string {
  return supabaseConfig.url
}

export function getSupabaseAnonKey(): string {
  return supabaseConfig.anonKey
}

export function createSupabaseClient(
  env: Record<string, string | undefined> = import.meta.env,
) {
  const config = resolveSupabaseConfig(env)

  if (!config.isConfigured) {
    return null
  }

  return {
    url: config.url,
    anonKey: config.anonKey,
    isConfigured: true,
  }
}
