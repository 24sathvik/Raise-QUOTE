'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function upsertCategory(data: { id?: string; name: string }) {
  const supabase = createAdminClient()

  if (data.id) {
    const { error } = await supabase
      .from('categories')
      .update({ name: data.name })
      .eq('id', data.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('categories')
      .insert({ name: data.name })
    if (error) return { error: error.message }
  }

  revalidatePath('/admin/categories')
  revalidatePath('/admin/products')
  return { success: true }
}

export async function deleteCategory(id: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/categories')
  return { success: true }
}
