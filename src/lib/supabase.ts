import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The browser-side Supabase client.
 *
 * The publishable key is meant to ship in the bundle — every table has row
 * level security, so this key alone grants nothing. Authorisation happens in
 * Postgres against the signed-in user, not in this code.
 *
 * If the env vars are missing the app still runs: `supabase` is null and the
 * UI falls back to guest-only mode rather than crashing on a blank screen.
 */
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null

export const isSupabaseConfigured = supabase !== null

if (!isSupabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[skinverse] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 가 없습니다. ' +
      '회원 기능이 꺼진 채로 실행됩니다. .env.example 을 참고해 .env.local 을 만드세요.',
  )
}
