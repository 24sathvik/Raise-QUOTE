import { createClient } from "@/lib/supabase/server"
import UsersClient from "./UsersClient"

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  
  const [{ data: users }] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
  ])

  return <UsersClient initialUsers={users || []} />
}
