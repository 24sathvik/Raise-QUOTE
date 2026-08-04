import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import QuotationsClient from "./QuotationsClient"

export const dynamic = 'force-dynamic'

export default async function UserQuotationsPage() {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login')
  }

  // Fetch full profile info for current user
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  let { data: quotations, error } = await supabase
    .from("quotations")
    .select(`id, quotation_number, customer_name, customer_company, customer_phone, customer_email, grand_total, created_at, status, pdf_url, revision_number`)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })

  if (error && error.message?.includes('revision_number')) {
    const fallback = await supabase
      .from("quotations")
      .select(`id, quotation_number, customer_name, customer_company, customer_phone, customer_email, grand_total, created_at, status, pdf_url`)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
    quotations = fallback.data as any
  }

  return (
    <QuotationsClient 
      initialQuotations={quotations || []} 
      user={profile || { full_name: 'User', role: 'sales' }} 
    />
  )
}
