import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const originalFetch = typeof window !== 'undefined' ? window.fetch : fetch
let isRefreshing = false

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const urlString = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

  // 1. Skip interceptor for authentication requests to prevent infinite loops, and skip server-side execution
  if (typeof window === 'undefined' || urlString.includes('/auth/v1/')) {
    return originalFetch(input, init)
  }

  // 2. Before every request — silently refresh the auth token first
  try {
    if (!isRefreshing) {
      isRefreshing = true
      await supabase.auth.refreshSession()
      isRefreshing = false
    }
  } catch (e) {
    isRefreshing = false
  }

  // Attach the fresh token to the request header
  const { data: { session } } = await supabase.auth.getSession()
  
  let newInit = init ? { ...init } : {}
  if (session?.access_token) {
    const newHeaders = new Headers(newInit.headers)
    newHeaders.set('Authorization', `Bearer ${session.access_token}`)
    newInit.headers = newHeaders
  }

  // 3. Make the initial request
  let response = await originalFetch(input, newInit)

  // 4. If 401 or 403, retry once
  if (response.status === 401 || response.status === 403) {
    try {
      if (!isRefreshing) {
        isRefreshing = true
        await supabase.auth.refreshSession()
        isRefreshing = false
      }
    } catch (e) {
      isRefreshing = false
    }
    
    const { data: { session: retrySession } } = await supabase.auth.getSession()
    if (retrySession?.access_token) {
      const retryHeaders = new Headers(newInit.headers)
      retryHeaders.set('Authorization', `Bearer ${retrySession.access_token}`)
      newInit.headers = retryHeaders
      
      response = await originalFetch(input, newInit)
    }
    
    // 5. If the retry also fails
    if (response.status === 401 || response.status === 403) {
      toast.error('Session expired. Please log in again.')
      window.location.href = '/auth/login'
      throw new Error('Session expired')
    }
  }

  return response
}

// Override global fetch in the browser so it covers everything natively using fetch
if (typeof window !== 'undefined') {
  window.fetch = customFetch
}

// ✅ Created once, reused everywhere
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: typeof window !== 'undefined' ? customFetch : undefined
  }
})

// Keep this for any imports that call createClient()
export function createClient() {
  return supabase
}
