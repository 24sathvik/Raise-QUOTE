'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function upsertProduct(data: {
  id?: string
  name: string
  description?: string
  price: number
  tax_percent: number
  active: boolean
  image_url?: string | null
  image_format?: string
  sku?: string
  category?: string
  specs?: any[]
  addons?: any[]
  line_items?: any[]
  features?: any[]
}) {
  const supabase = createAdminClient()

  const productData = {
    name: data.name,
    description: data.description || '',
    price: Number(data.price),
    tax_percent: Number(data.tax_percent) || 0,
    active: data.active,
    image_url: data.image_url || null,
    image_format: data.image_format || 'wide',
    sku: data.sku || '',
    category: data.category || '',
    specs: data.specs || [],
    addons: data.addons || [],
    line_items: data.line_items || [],
    features: data.features || [],
  }

  if (data.id) {
    const { error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('products')
      .insert(productData)
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/products')
  revalidatePath('/catalog')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/products')
  revalidatePath('/catalog')
  return { success: true }
}

export async function toggleProductStatus(id: string, active: boolean) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('products')
    .update({ active })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/products')
  return { success: true }
}
