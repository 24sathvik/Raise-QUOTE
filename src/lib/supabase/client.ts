import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_key'

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  }
})


supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' && typeof window !== 'undefined') {
    toast.error('Session expired. Please log in again.')
    window.location.href = '/auth/login'
  }
})