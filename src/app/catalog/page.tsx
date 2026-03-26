import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CatalogClient from './CatalogClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function CatalogPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  let products: any[] = []

  try {
    const { data } = await supabase
      .from('products')
      .select('id, name, description, price, image_url, sku, specs, category, active')
      .eq('active', true)
      .order('name')

    products = data || []
  } catch (error) {
    console.error('Products query error:', error)
    products = []
  }

  return <CatalogClient initialProducts={products} />
}
