import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ✅ Created once, reused everywhere
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Keep this for any imports that call createClient()
export function createClient() {
  return supabase
}
