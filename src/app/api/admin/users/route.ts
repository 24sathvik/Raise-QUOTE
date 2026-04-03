import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role — never expose client-side
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, phone, role } = body
    const full_name = body.full_name || body.name

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: full_name }
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: authData.user.id,
      full_name,
      email,
      phone,
      role,
      active: true,
    })

    if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

    return NextResponse.json({ success: true, id: authData.user.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
