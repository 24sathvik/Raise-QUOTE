import { createClient } from "@/lib/supabase/server"
import QuotationsClient from "./QuotationsClient"

export const dynamic = 'force-dynamic'

export default async function QuotationsPage() {
  const supabase = await createClient()
  const { data: quotations } = await supabase
    .from("quotations")
    .select(`id, quotation_number, customer_name, grand_total, created_at, pdf_url, profiles!created_by (full_name)`)
    .order("created_at", { ascending: false })
    .limit(100)

  return <QuotationsClient initialQuotations={quotations || []} />
}
