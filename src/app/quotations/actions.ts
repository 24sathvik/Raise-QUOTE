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
  revalidatePath('/quotations')
  return { success: true }
}

export async function getNextQuotationNumber() {
  const supabase = createAdminClient()
  try {
    const { data: lastQuotation } = await supabase
      .from('quotations')
      .select('quotation_number')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let nextNumber = 'RLE-101'
    if (lastQuotation?.quotation_number) {
      const match = lastQuotation.quotation_number.match(/RLE-(\d+)/)
      if (match) {
        const num = parseInt(match[1]) + 1
        nextNumber = `RLE-${num}`
      }
    }
    return { number: nextNumber }
  } catch {
    return { number: 'RLE-101' }
  }
}

export async function saveQuotation(data: {
  quotation_number: string
  created_by: string
  customer_name: string
  customer_company?: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
  items_json: any[]
  subtotal: number
  tax_amount: number
  total_amount: number
  discount_total: number
  grand_total: number
  status: string
}) {
  const supabase = createAdminClient()
  const { data: quotation, error } = await supabase
    .from('quotations')
    .insert(data)
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/quotations')
  revalidatePath('/admin/quotations')
  return { data: quotation }
}

export async function updateQuotationPdfUrl(id: string, pdf_url: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('quotations')
    .update({ pdf_url })
    .eq('id', id)
  if (error) return { error: error.message }
  return { success: true }
}
