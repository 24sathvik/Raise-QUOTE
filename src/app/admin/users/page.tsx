import { createClient } from "@/lib/supabase/server"
import UsersClient from "./UsersClient"

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  console.log("USERS FETCH:", users?.length, "ERROR:", error?.message)

  return <UsersClient initialUsers={users || []} />
}
