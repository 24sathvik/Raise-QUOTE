import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const path = request.nextUrl.pathname

  // 1. Bypass static assets, API routes, and public files
  const isStatic =
    path.startsWith('/_next') ||
    path.startsWith('/icons') ||
    path.startsWith('/site') ||
    path.startsWith('/api/') ||
    path.endsWith('.png') ||
    path.endsWith('.jpg') ||
    path.endsWith('.jpeg') ||
    path.endsWith('.webp') ||
    path.endsWith('.svg') ||
    path.endsWith('.json') ||
    path.endsWith('.ico')

  if (isStatic) {
    return supabaseResponse
  }

  // 2. Cookie synchronization for SSR responses
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Check user authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is not authenticated and trying to access protected routes, redirect to login
  if (
    !user &&
    !path.startsWith('/auth') &&
    !path.startsWith('/catalog') &&
    !path.startsWith('/offline') &&
    !path.startsWith('/setup')
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // If user is authenticated and on login page, redirect to home
  if (user && path === '/auth/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
