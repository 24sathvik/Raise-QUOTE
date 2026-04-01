import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertProduct(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const price = parseFloat(formData.get('price') as string)
  const tax_percent = parseFloat(formData.get('tax_percent') as string) || 0
  const active = formData.get('active') === 'true'
  const image_format = formData.get('image_format') as string || 'wide'
  const image_url = formData.get('image_url') as string

  const sku = formData.get('sku') as string
  const category = formData.get('category') as string
  const specsString = formData.get('specs') as string
  const addonsString = formData.get('addons') as string
  const lineItemsString = formData.get('line_items') as string

  let specs = []
  let addons = []
  let line_items = []
  try {
    if (specsString) {
      specs = JSON.parse(specsString)
    }
  } catch (e) {
    console.error('Failed to parse specs', e)
  }

  try {
    if (addonsString) addons = JSON.parse(addonsString)
  } catch (e) {
    console.error('Failed to parse addons', e)
  }

  try {
    if (lineItemsString) line_items = JSON.parse(lineItemsString)
  } catch (e) {
    console.error('Failed to parse line items', e)
  }

  const productData = {
    name,
    description,
    price,
    tax_percent,
    active,
    image_url,
    image_format,
    sku,
    category,
    specs,
    addons,
    line_items
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
