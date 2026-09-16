import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import type { Lang, SkinConditionKey } from '../data/types'

export interface Profile {
  id: string
  name: string
  country: string
  address: string
  points: number
  streak: number
  language: Lang
  city: string
  skin_condition: SkinConditionKey
  routine_reminders: boolean
  /**
   * The member's IANA timezone, which decides when their analysis allowance
   * resets. Stored rather than read per request so the boundary is a property
   * of the account, not of whatever clock the current request claimed.
   */
  timezone: string

  /** Kept apart from the number so the code stays a choice, not a typo. */
  phone_cc: string | null
  phone: string | null
  postal_code: string | null
  gender: string | null
  /** ISO date, or null when they declined to give one. */
  birth_date: string | null
  /**
   * Korea's personal customs clearance code. Optional everywhere and never
   * required to sign up — most customers have no parcel to clear.
   */
  customs_code: string | null
}

/** The browser's own zone, or Seoul when it will not say. */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul'
  } catch {
    return 'Asia/Seoul'
  }
}

export interface AuthResult {
  ok: boolean
  /** Set when signup succeeded but the account still needs email confirmation. */
  needsEmailConfirm?: boolean
  /** Raw message from Supabase, for the form to translate or show verbatim. */
  error?: string
}

/**
 * Only the first three are an account. The rest describe a shopper, and the
 * operator console signs people up without any of them — an admin has nothing
 * to ship and no reason to hand over a birth date to get a console login.
 */
interface SignUpInput {
  email: string
  password: string
  name: string
  language?: Lang
  country?: string
  city?: string
  phoneCc?: string
  phone?: string
  address?: string
  postalCode?: string
  gender?: string
  birthDate?: string
  /** May be empty; it never blocks a signup. */
  customsCode?: string
}

function useAuthValue() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  /** True until the stored session has been read — prevents a signed-in user flashing the guest UI. */
  const [loading, setLoading] = useState(isSupabaseConfigured)

  const loadProfile = useCallback(async (user: User | null) => {
    if (!supabase || !user) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    if (error) {
      console.error('[skinverse] 프로필을 불러오지 못했습니다', error.message)
      setProfile(null)
      return
    }
    setProfile((data as Profile) ?? null)
  }, [])

  useEffect(() => {
    if (!supabase) return

    let cancelled = false

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      setSession(data.session)
      await loadProfile(data.session?.user ?? null)
      if (!cancelled) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      void loadProfile(next?.user ?? null)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = useCallback(async (input: SignUpInput): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'not-configured' }

    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      // Read by the handle_new_user() trigger to seed the profile row.
      options: {
        data: {
          name: input.name,
          language: input.language ?? 'ko',
          country: input.country ?? '',
          city: input.city ?? '',
          timezone: deviceTimezone(),
          phone_cc: input.phoneCc ?? '',
          phone: input.phone ?? '',
          address: input.address ?? '',
          postal_code: input.postalCode ?? '',
          gender: input.gender ?? '',
          birth_date: input.birthDate ?? '',
          customs_code: input.customsCode ?? '',
        },
      },
    })
    if (error) return { ok: false, error: error.message }

    // With email confirmation on, Supabase returns a user but no session.
    if (!data.session) return { ok: true, needsEmailConfirm: true }
    return { ok: true }
  }, [])

  const signIn = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    if (!supabase) return { ok: false, error: 'not-configured' }
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { ok: false, error: error.message } : { ok: true }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  /** Patch the profile row and mirror the change locally so the UI updates at once. */
  const updateProfile = useCallback(
    async (patch: Partial<Omit<Profile, 'id'>>) => {
      setProfile((prev) => (prev ? { ...prev, ...patch } : prev))
      if (!supabase || !session?.user) return
      const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id)
      if (error) console.error('[skinverse] 프로필 저장 실패', error.message)
    },
    [session],
  )

  /** Re-read the profile after a server-side change (points spent, order placed). */
  const refreshProfile = useCallback(
    () => loadProfile(session?.user ?? null),
    [loadProfile, session],
  )

  return useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isMember: !!session,
      isConfigured: isSupabaseConfigured,
      signUp,
      signIn,
      signOut,
      updateProfile,
      refreshProfile,
    }),
    [session, profile, loading, signUp, signIn, signOut, updateProfile, refreshProfile],
  )
}

export type AuthValue = ReturnType<typeof useAuthValue>

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthValue()
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
