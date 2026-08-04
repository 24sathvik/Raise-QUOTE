import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import QuotationBuilder from '@/components/quotation/QuotationBuilder'
import { getQuotationById } from '@/app/quotations/actions'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SalesPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const profileResponse = await supabase
    .from('profiles')
    .select('id, full_name, email, role, active, phone')
    .eq('id', user.id)
    .single()

  const userProfile = profileResponse.data

  // If user is admin and not editing a quote, redirect to admin panel
  if (userProfile?.role === 'admin' && !searchParams.edit) {
    redirect('/admin/quotations')
  }

  const [productsResponse, settingsResponse] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, description, price, image_url, sku, specs, features, category, addons, image_format, line_items')
      .eq('active', true)
      .order('name'),
    supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single()
  ])

  let editingQuotation = null
  if (searchParams.edit) {
    const result = await getQuotationById(searchParams.edit)
    if (result?.data) {
      editingQuotation = result.data
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <QuotationBuilder
        initialProducts={productsResponse.data || []}
        settings={settingsResponse.data || null}
        user={userProfile}
        editingQuotation={editingQuotation}
      />
    </div>
  )
}
