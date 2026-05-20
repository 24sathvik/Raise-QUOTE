import { createClient } from "@/lib/supabase/server"
import QuotationsClient from "./QuotationsClient"

export const dynamic = 'force-dynamic'

export default async function QuotationsPage(props: { searchParams: Promise<{ [key: string]: string }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  let query = supabase
    .from("quotations")
    .select(`id, quotation_number, customer_name, customer_company, customer_phone, customer_email, customer_address, grand_total, created_at, pdf_url, status, items_json, profiles!created_by (full_name)`)

  if (searchParams.month && searchParams.year) {
    const year = parseInt(searchParams.year)
    const month = parseInt(searchParams.month)
    const start = new Date(Date.UTC(year, month - 1, 1)).toISOString()
    const end = new Date(Date.UTC(year, month, 1)).toISOString()
    query = query.gte('created_at', start).lt('created_at', end)
  }

  if (searchParams.status === 'pending_negotiating') {
    query = query.in('status', ['pending', 'negotiating'])
  } else if (searchParams.status) {
    query = query.eq('status', searchParams.status)
  }

  const [{ data: quotations }, { data: settings }] = await Promise.all([
    query.order("created_at", { ascending: false }).limit(100),
    supabase.from("settings").select("*").eq("id", 1).single()
  ])

  const activeFilters = {
    month: searchParams.month,
    year: searchParams.year,
    status: searchParams.status
  }

  return <QuotationsClient initialQuotations={(quotations as any) || []} activeFilters={activeFilters} settings={settings} />
}
