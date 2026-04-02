import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuotationBuilder from '@/components/quotation/QuotationBuilder'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SalesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const productsResponse = await supabase
    .from('products')
    .select('id, name, description, price, image_url, sku, specs, features, category, addons, image_format, line_items')
    .eq('active', true)
    .order('name')

  const profileResponse = await supabase
    .from('profiles')
    .select('id, full_name, email, role, active, phone')
    .eq('id', user.id)
    .single()

  if (profileResponse.data?.role === 'admin') {
    redirect('/admin/quotations')
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <QuotationBuilder
        initialProducts={productsResponse.data || []}
        settings={null}
        user={profileResponse.data}
      />
    </div>
  )
}
