'use client'

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

// The columns useAuth() consumers actually read, verified across all 30 files
// that call it. Replaces select('*'), which pulled all 39 columns of the row on
// the hottest path in the app.
//
// Do not trim this to "the obvious identity fields" without re-checking those
// consumers — email, admin_role and the three balances are all genuinely read,
// and a missing column here fails silently as `undefined` rather than erroring.
const PROFILE_COLUMNS = [
  'id',
  'full_name',
  'avatar_url',
  'email',
  'phone',
  'is_admin',
  'admin_role',
  'is_artist',
  'is_organizer',
  'is_provider',
  'is_verified',
  'verified_entity_type',
  'wallet_balance',
  'held_balance',
  'pending_payout_balance',
].join(', ')

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  // Was `createClient()` on every render — a fresh Supabase client instance each
  // time this provider re-rendered, which is every navigation in the app.
  const supabase = useMemo(() => createClient(), [])
  // Which user's profile we have already loaded, so routine auth events
  // (TOKEN_REFRESHED fires on a timer) don't re-query for data we hold.
  const loadedProfileFor = useRef<string | null>(null)

  // Fetch user profile from database, create if doesn't exist
  const fetchProfile = async (userId: string, userEmail?: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .single()

    if (error) {
      // If profile doesn't exist, create it
      if (error.code === 'PGRST116' && userEmail) {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: userEmail,
            full_name: userEmail.split('@')[0],
            is_artist: false,
            is_organizer: false,
            is_provider: false,
            is_admin: false,
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          return null
        }
        return newProfile
      }
      console.error('Error fetching profile:', error)
      return null
    }
    return data
  }

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id)
      setProfile(profileData)
    }
  }

  // Sign out user
  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    window.location.reload()
  }

  useEffect(() => {
    // `loading` releases as soon as the session is known — it does NOT wait for
    // the profile. This is the fix for "buttons don't respond": the navbar and
    // every client page read useAuth() and sat inert until a second round trip
    // to the database in Ireland came back. Who you are is enough to make the
    // UI interactive; what your balance is can arrive a moment later.
    const loadProfile = async (sessionUser: User) => {
      if (loadedProfileFor.current === sessionUser.id) return
      loadedProfileFor.current = sessionUser.id
      const profileData = await fetchProfile(sessionUser.id, sessionUser.email)
      setProfile(profileData)
    }

    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)
        setLoading(false)
        void loadProfile(session.user)
      } else {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          setLoading(false)
          // Only refetch when the identity actually changed. TOKEN_REFRESHED
          // fires periodically for a signed-in user and used to trigger a full
          // profile read every time.
          void loadProfile(session.user)
        } else {
          loadedProfileFor.current = null
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
