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
    const { data: allQuotes } = await supabase
      .from('quotations')
      .select('quotation_number')
      .limit(1000)

    let maxNum = 100
    if (allQuotes && allQuotes.length > 0) {
      for (const q of allQuotes) {
        if (q.quotation_number) {
          const match = q.quotation_number.match(/RLE-(\d+)/i)
          if (match) {
            const num = parseInt(match[1], 10)
            if (!isNaN(num) && num > maxNum) {
              maxNum = num
            }
          }
        }
      }
    }
    return { number: `RLE-${maxNum + 1}` }
  } catch {
    return { number: 'RLE-101' }
  }
}

export async function getQuotationById(id: string) {
  const supabase = createAdminClient()
  let { data: quotation, error } = await supabase
    .from('quotations')
    .select(`
      id,
      quotation_number,
      created_by,
      customer_name,
      customer_company,
      customer_phone,
      customer_email,
      customer_address,
      items_json,
      subtotal,
      tax_amount,
      total_amount,
      discount_total,
      grand_total,
      status,
      pdf_url,
      created_at,
      revision_number
    `)
    .eq('id', id)
    .single()

  if (error && error.message?.includes('revision_number')) {
    const fallback = await supabase
      .from('quotations')
      .select(`
        id,
        quotation_number,
        created_by,
        customer_name,
        customer_company,
        customer_phone,
        customer_email,
        customer_address,
        items_json,
        subtotal,
        tax_amount,
        total_amount,
        discount_total,
        grand_total,
        status,
        pdf_url,
        created_at
      `)
      .eq('id', id)
      .single()
    
    if (fallback.data) {
      const items = Array.isArray(fallback.data.items_json) ? fallback.data.items_json : []
      const metaRev = (fallback.data.items_json as any)?._metadata?.revision_number
      quotation = { ...fallback.data, revision_number: metaRev ?? 0 } as any
    }
    error = fallback.error
  }

  if (error) return { error: error.message }
  return { data: quotation }
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
  revision_number?: number
}) {
  const supabase = createAdminClient()
  let insertData = { ...data, revision_number: data.revision_number || 0 }
  let { data: quotation, error } = await supabase
    .from('quotations')
    .insert(insertData)
    .select()
    .single()

  if (error && error.message?.includes('revision_number')) {
    const { revision_number, ...fallbackData } = insertData
    const fallback = await supabase
      .from('quotations')
      .insert(fallbackData)
      .select()
      .single()
    quotation = fallback.data
    error = fallback.error
  }

  // If unique constraint on quotation_number occurred, generate next available number and retry
  if (error && (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate'))) {
    const nextRes = await getNextQuotationNumber()
    insertData.quotation_number = nextRes.number
    const retry = await supabase
      .from('quotations')
      .insert(insertData)
      .select()
      .single()
    
    if (retry.error && retry.error.message?.includes('revision_number')) {
      const { revision_number, ...fallbackData } = insertData
      const retryFallback = await supabase
        .from('quotations')
        .insert(fallbackData)
        .select()
        .single()
      quotation = retryFallback.data
      error = retryFallback.error
    } else {
      quotation = retry.data
      error = retry.error
    }
  }

  if (error) return { error: error.message }
  revalidatePath('/quotations')
  revalidatePath('/admin/quotations')
  return { data: quotation }
}

export async function updateQuotation(id: string, data: {
  quotation_number?: string
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
  status?: string
  revision_number: number
}) {
  const supabase = createAdminClient()
  const updateFields: any = {
    customer_name: data.customer_name,
    customer_company: data.customer_company,
    customer_phone: data.customer_phone,
    customer_email: data.customer_email,
    customer_address: data.customer_address,
    items_json: data.items_json,
    subtotal: data.subtotal,
    tax_amount: data.tax_amount,
    total_amount: data.total_amount,
    discount_total: data.discount_total,
    grand_total: data.grand_total,
    revision_number: data.revision_number,
    ...(data.status ? { status: data.status } : {}),
    ...(data.quotation_number ? { quotation_number: data.quotation_number } : {})
  }

  let { data: quotation, error } = await supabase
    .from('quotations')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single()

  if (error && error.message?.includes('revision_number')) {
    const { revision_number, ...fallbackFields } = updateFields
    const fallback = await supabase
      .from('quotations')
      .update(fallbackFields)
      .eq('id', id)
      .select()
      .single()
    quotation = fallback.data ? { ...fallback.data, revision_number: data.revision_number } : null
    error = fallback.error
  }

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
  revalidatePath('/quotations')
  revalidatePath('/admin/quotations')
  return { success: true }
}
