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
    .maybeSingle()

  const userProfile = profileResponse.data

  const editParam = searchParams.edit || searchParams.id || searchParams.quotationId || searchParams.editId

  // If user is admin and not editing a quote, redirect to admin panel
  if (userProfile?.role === 'admin' && !editParam) {
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
      .maybeSingle()
  ])

  let editingQuotation = null
  if (editParam) {
    const result = await getQuotationById(editParam)
    if (result?.data) {
      editingQuotation = result.data
    } else if (userProfile?.role === 'admin') {
      // If admin attempted to edit a non-existent quotation, redirect back to admin list
      redirect('/admin/quotations')
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
