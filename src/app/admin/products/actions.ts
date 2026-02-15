import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertProduct(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const mrp = parseFloat(formData.get('mrp') as string) || 0 // Handle MRP
  const tax_percent = parseFloat(formData.get('tax_percent') as string) || 0
  const active = formData.get('active') === 'true'
  const image_format = formData.get('image_format') as string || 'wide'
  const image_url = formData.get('image_url') as string

  const sku = formData.get('sku') as string
  const category = formData.get('category') as string
  const specsString = formData.get('specs') as string

  let specs = []
  try {
    if (specsString) {
      specs = JSON.parse(specsString)
    }
  } catch (e) {
    // console.error('Failed to parse specs', e)
  }

  const productData = {
    name,
    description,
    price,
    mrp, // Add MRP to data

    tax_percent,
    active,
    image_url,
    image_format,
    sku,
    category,
    specs
  }

  if (id) {
    const { error } = await supabase
      .from('products')
      .update(productData)
      .eq('id', id)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('products')
      .insert(productData)

    if (error) return { error: error.message }
  }

  revalidatePath('/admin/products')
  return { success: true }
}

export async function deleteProduct(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/products')
  return { success: true }
}

export async function toggleProductStatus(id: string, active: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .update({ active })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/products')
  return { success: true }
}
