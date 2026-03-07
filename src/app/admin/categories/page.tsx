import { createClient } from "@/lib/supabase/server"
import CategoriesClient from "./CategoriesClient"

export const dynamic = 'force-dynamic'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("name")

  return <CategoriesClient initialCategories={categories || []} />
}
