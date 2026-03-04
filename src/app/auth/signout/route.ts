import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    // ✅ Let Supabase handle cookie clearing — no hardcoded names
    await supabase.auth.signOut()
  }

  revalidatePath('/', 'layout')

  return NextResponse.redirect(new URL('/auth/login', req.url), {
    status: 302,
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
