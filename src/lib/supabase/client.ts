import { createBrowserClient } from '@supabase/ssr'
import { toast } from 'sonner'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const originalFetch = typeof window !== 'undefined' ? window.fetch : fetch
let isRefreshing = false

const customFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const urlString = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const isSupabaseCall = urlString.includes(supabaseUrl) && !urlString.includes('/auth/v1/')
  const isLocalApiCall = typeof input === 'string' && input.startsWith('/api/')

  // 1. Skip interceptor for authentication requests and Next.js internals to prevent infinite loops and AbortErrors
  if (typeof window === 'undefined' || (!isSupabaseCall && !isLocalApiCall)) {
    return originalFetch(input, init)
  }

  // 2. Safely extract headers whether input is a Request or just strings
  let headers = new Headers()
  if (input instanceof Request) {
    input.headers.forEach((value, key) => headers.set(key, value))
  }
  if (init?.headers) {
    const initHeaders = new Headers(init.headers)
    initHeaders.forEach((value, key) => headers.set(key, value))
  }

  // 3. Get session (automatically triggers a background refresh via SDK if expired soon)
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }

  // Next.js patches require init to be completely safe
  const newInit: RequestInit = { ...init, headers }

  const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  // 🔥 GLOBAL CHECK: Strip abort signals from all mutations
  // This prevents React useEffect cleanups or Next.js router cancellations from 
  // aborting in-flight database writes (create, update, delete, upload).
  if (isMutation && newInit.signal) {
    delete newInit.signal
  }

  // 4. Make the initial request
  let response = await originalFetch(input, newInit)

  // 5. If 401 or 403, violently refresh and retry once
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
      headers.set('Authorization', `Bearer ${retrySession.access_token}`)
      newInit.headers = headers
      response = await originalFetch(input, newInit)
    }
    
    // 6. If the retry also fails
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
