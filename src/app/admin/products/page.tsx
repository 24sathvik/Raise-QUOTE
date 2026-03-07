import { createClient } from "@/lib/supabase/server"
import ProductsClient from "./ProductsClient"

export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
  const supabase = await createClient()

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").order("created_at", { ascending: false }),
    supabase.from("categories").select("id, name").order("name")
  ])

  return (
    <ProductsClient
      initialProducts={products || []}
      initialCategories={categories || []}
    />
  )
}
