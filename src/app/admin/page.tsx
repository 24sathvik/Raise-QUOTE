import { createClient } from "@/lib/supabase/server"
import AdminAnalyticsClient from "./AdminAnalyticsClient"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Use Promise.all for parallel fetching
  const [
    { data: quotations },
    { count: approvedCount },
    { count: pendingCount },
    { count: rejectedCount }
  ] = await Promise.all([
    supabase
      .from("quotations")
      .select(`
        id, 
        quotation_number, 
        created_at, 
        grand_total, 
        status, 
        profiles!created_by (id, full_name)
      `)
      .order("created_at", { ascending: false }),
    supabase.from("quotations").select("*", { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from("quotations").select("*", { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from("quotations").select("*", { count: 'exact', head: true }).eq('status', 'rejected')
  ])

  // Pass individual server-side counts if AdminAnalyticsClient accepts them, 
  // or just pass quotations and update AdminAnalyticsClient. For now passing quotations to child.
  return (
    <div className="pb-10">
      <AdminAnalyticsClient 
        quotations={quotations || []} 
        serverCounts={{
          approved: approvedCount || 0,
          pending: pendingCount || 0,
          rejected: rejectedCount || 0
        }}
      />
    </div>
  )
}
