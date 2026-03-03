'use client'
import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'

interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: 'admin' | 'sales'
  active: boolean
  phone: string | null
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // ✅ Fix 1: useRef so supabase is created ONCE, never triggers re-renders
  const supabaseRef = useRef(createClient())
  const supabase = supabaseRef.current

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, active, phone')
      .eq('id', userId)
      .single()
    return data as Profile | null
  }

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        // ✅ Fix 2: getUser() instead of getSession() — validates with server
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          if (mounted) {
            setUser(null)
            setSession(null)
            setProfile(null)
          }
          return
        }

        // Get session separately just for the session object
        const { data: { session } } = await supabase.auth.getSession()
        const profileData = await fetchProfile(user.id)

        if (mounted) {
          setUser(user)
          setSession(session)
          setProfile(profileData)
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    // ✅ Fix 3: onAuthStateChange handles all subsequent auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id)
          if (mounted) setProfile(profileData)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // ✅ Fix 4: empty deps — runs once on mount only

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
