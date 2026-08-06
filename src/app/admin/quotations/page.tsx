import { createClient } from "@/lib/supabase/server"
import QuotationsClient from "./QuotationsClient"

export const dynamic = 'force-dynamic'

export default async function QuotationsPage(props: { searchParams: Promise<{ [key: string]: string }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()

  let query = supabase
    .from("quotations")
    .select(`id, quotation_number, customer_name, customer_company, customer_phone, customer_email, customer_address, grand_total, created_at, pdf_url, status, items_json, revision_number, profiles!created_by (full_name)`)

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

  let [{ data: quotations, error }, { data: settings }] = await Promise.all([
    query.order("created_at", { ascending: false }).limit(100),
    supabase.from("settings").select("*").eq("id", 1).single()
  ])

  if (error && error.message?.includes('revision_number')) {
    let fallbackQuery = supabase
      .from("quotations")
      .select(`id, quotation_number, customer_name, customer_company, customer_phone, customer_email, customer_address, grand_total, created_at, pdf_url, status, items_json, profiles!created_by (full_name)`)

    if (searchParams.month && searchParams.year) {
      const year = parseInt(searchParams.year)
      const month = parseInt(searchParams.month)
      const start = new Date(Date.UTC(year, month - 1, 1)).toISOString()
      const end = new Date(Date.UTC(year, month, 1)).toISOString()
      fallbackQuery = fallbackQuery.gte('created_at', start).lt('created_at', end)
    }

    if (searchParams.status === 'pending_negotiating') {
      fallbackQuery = fallbackQuery.in('status', ['pending', 'negotiating'])
    } else if (searchParams.status) {
      fallbackQuery = fallbackQuery.eq('status', searchParams.status)
    }

    const fallbackRes = await fallbackQuery.order("created_at", { ascending: false }).limit(100)
    quotations = fallbackRes.data
  }

  const activeFilters = {
    month: searchParams.month,
    year: searchParams.year,
    status: searchParams.status
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

  return <QuotationsClient initialQuotations={normalizedQuotations as any} activeFilters={activeFilters} settings={settings} />
}
