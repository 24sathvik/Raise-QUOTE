import { createClient } from '@supabase/supabase-js'

export const createAdminClient = () => {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://bcvcpvnpumxgwzznfsas.supabase.co'

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjdmNwdm5wdW14Z3d6em5mc2FzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2NjM4NjIsImV4cCI6MjA5NDIzOTg2Mn0.AVy0CVEZihIT2IzeL7eOL6bG8-zWbQwiUt3E2rAohXE'

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
