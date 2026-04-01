import { createClient } from "@/lib/supabase/server"
import QuotationsClient from "./QuotationsClient"

export const dynamic = 'force-dynamic'

export default async function QuotationsPage(props: { searchParams: Promise<{ [key: string]: string }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  let query = supabase
    .from("quotations")
    .select(`id, quotation_number, customer_name, customer_company, grand_total, created_at, pdf_url, status, profiles!created_by (full_name)`)
    .order("created_at", { ascending: false })

  if (searchParams.month && searchParams.year) {
    const start = new Date(parseInt(searchParams.year), parseInt(searchParams.month) - 1, 1).toISOString()
    const end = new Date(parseInt(searchParams.year), parseInt(searchParams.month), 0, 23, 59, 59).toISOString()
    query = query.gte('created_at', start).lte('created_at', end)
  }

  if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  const { data: quotations } = await query.limit(100)

  const activeFilters = {
    month: searchParams.month,
    year: searchParams.year,
    status: searchParams.status
  }

  return <QuotationsClient initialQuotations={(quotations as any) || []} activeFilters={activeFilters} />
}
