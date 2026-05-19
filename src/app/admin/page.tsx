import { createClient } from "@/lib/supabase/server"
import AdminAnalyticsClient from "./AdminAnalyticsClient"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: quotations } = await supabase
    .from("quotations")
    .select(`
      id,
      quotation_number,
      created_at,
      grand_total,
      status,
      profiles!created_by (id, full_name)
    `)
    .order("created_at", { ascending: false })

  return (
    <div className="pb-10">
      <AdminAnalyticsClient quotations={quotations as any || []} />
    </div>
  )
}

