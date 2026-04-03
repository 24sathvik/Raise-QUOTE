'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function updateQuotationStatus(id: string, status: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('quotations')
    .update({ status })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath('/admin/quotations')
  revalidatePath('/quotations')
  return { success: true }
}
