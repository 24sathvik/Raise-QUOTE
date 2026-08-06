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
    .select(`id, quotation_number, customer_name, customer_company, customer_phone, customer_email, grand_total, created_at, status, pdf_url, revision_number, items_json`)
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })

  if (error && error.message?.includes('revision_number')) {
    const fallback = await supabase
      .from("quotations")
      .select(`id, quotation_number, customer_name, customer_company, customer_phone, customer_email, grand_total, created_at, status, pdf_url, items_json`)
      .eq("created_by", user.id)
      .order("created_at", { ascending: false })
    quotations = fallback.data as any
  }

  const normalizedQuotations = (quotations || []).map((q: any) => {
    let rev = 0
    if (q.revision_number !== undefined && q.revision_number !== null) {
      rev = Number(q.revision_number)
    } else if (Array.isArray(q.items_json) && q.items_json[0]?._rev !== undefined) {
      rev = Number(q.items_json[0]._rev)
    } else if (q.quotation_number) {
      const match = q.quotation_number.match(/\((\d+)\)$/)
      if (match) rev = parseInt(match[1], 10) || 0
    }
    const cleanNumber = (q.quotation_number || 'RLE-101').replace(/\(\d+\)$/, '').trim()
    return {
      ...q,
      quotation_number: cleanNumber,
      revision_number: rev,
    }
  })

  return (
    <QuotationsClient 
      initialQuotations={normalizedQuotations as any} 
      user={profile || { full_name: 'User', role: 'sales' }} 
    />
  )
}
