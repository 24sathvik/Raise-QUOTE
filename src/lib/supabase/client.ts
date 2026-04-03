import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT' && typeof window !== 'undefined') {
    toast.error('Session expired. Please log in again.')
    window.location.href = '/auth/login'
  }
})

export function createClient() {
  return supabase
}