import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The browser-side Supabase client.
 *
 * The project URL and publishable key are baked in as defaults on purpose.
 * Neither is a secret: the key is designed to ship inside the bundle, and every
 * table is guarded by row level security, so on its own it grants nothing —
 * authorisation happens in Postgres against the signed-in user, not here. Any
 * visitor could read these two values out of the deployed JavaScript regardless,
 * so keeping them in an env var buys no safety and only means the app breaks
 * when a deploy forgets to set them.
 *
 * Env vars still win when present, which is what a separate staging project
 * would use.
 *
 * The service_role key is the one that must never appear here — it bypasses RLS
 * entirely and belongs only on a server.
 */
const DEFAULT_URL = 'https://pfovxylewqthuhecfgvx.supabase.co'
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_GYWHR_srCWZIVN9hE6SiBw_0TWju7PE'

const url = import.meta.env.VITE_SUPABASE_URL || DEFAULT_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_PUBLISHABLE_KEY

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

export const isSupabaseConfigured = supabase !== null
