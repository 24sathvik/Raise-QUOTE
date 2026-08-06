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
  revalidatePath('/admin/quotations')
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

export async function getQuotationById(idOrNumber: string) {
  if (!idOrNumber) return { error: 'No quotation identifier provided' }
  try {
    const trimmed = idOrNumber.trim()
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)

    let quotation: any = null
    let error: any = null

    // 1. Try server admin client first
    try {
      const supabase = createAdminClient()
      let query = supabase.from('quotations').select('*')
      if (isUUID) {
        query = query.eq('id', trimmed)
      } else {
        query = query.eq('quotation_number', trimmed)
      }
      const res = await query.maybeSingle()
      quotation = res.data
      error = res.error
    } catch (adminErr) {
      console.warn('createAdminClient error, falling back:', adminErr)
    }

    // 2. If not found or error, try with server cookie client
    if (!quotation) {
      try {
        const { createClient } = await import('@/lib/supabase/server')
        const userClient = await createClient()
        let query = userClient.from('quotations').select('*')
        if (isUUID) {
          query = query.eq('id', trimmed)
        } else {
          query = query.eq('quotation_number', trimmed)
        }
        const userRes = await query.maybeSingle()
        if (userRes.data) {
          quotation = userRes.data
          error = null
        }
      } catch (userErr) {
        console.warn('userClient error in getQuotationById:', userErr)
      }
    }

    if (!quotation && isUUID) {
      try {
        const supabase = createAdminClient()
        const byNum = await supabase.from('quotations').select('*').eq('quotation_number', trimmed).maybeSingle()
        if (byNum.data) {
          quotation = byNum.data
          error = null
        }
      } catch {
        // Ignore fallback error
      }
    }

    if (!quotation) {
      return { error: error?.message || 'Quotation not found' }
    }

    // Normalize quotation fields for safe client consumption
    const items = Array.isArray(quotation.items_json)
      ? quotation.items_json
      : (typeof quotation.items_json === 'string'
          ? (() => { try { return JSON.parse(quotation.items_json) } catch { return [] } })()
          : [])

    // Extract revision from:
    // 1. DB column `revision_number`
    // 2. Embedded metadata `items[0]?._rev` or `_metadata?.revision_number`
    // 3. String in `quotation_number` like RLE-101(1) or RLE-101(2)
    let parsedRev = 0
    if (quotation.revision_number !== undefined && quotation.revision_number !== null) {
      parsedRev = Number(quotation.revision_number)
    } else if (items.length > 0 && items[0]?._rev !== undefined) {
      parsedRev = Number(items[0]._rev)
    } else if ((quotation.items_json as any)?._metadata?.revision_number !== undefined) {
      parsedRev = Number((quotation.items_json as any)._metadata.revision_number)
    } else if (quotation.quotation_number) {
      const match = quotation.quotation_number.match(/\((\d+)\)$/)
      if (match) {
        parsedRev = parseInt(match[1], 10) || 0
      }
    }

    // Strip revision suffix from base number for clean UI presentation
    const baseNumber = quotation.quotation_number
      ? quotation.quotation_number.replace(/\(\d+\)$/, '').trim()
      : 'RLE-101'

    const normalizedQuotation = {
      ...quotation,
      quotation_number: baseNumber,
      items_json: items,
      revision_number: parsedRev,
      subtotal: Number(quotation.subtotal || 0),
      discount_total: Number(quotation.discount_total || 0),
      tax_amount: Number(quotation.tax_amount ?? quotation.tax_total ?? 0),
      total_amount: Number(quotation.total_amount ?? quotation.grand_total ?? 0),
      grand_total: Number(quotation.grand_total || 0),
    }

    return { data: JSON.parse(JSON.stringify(normalizedQuotation)) }
  } catch (err: any) {
    console.error('Unhandled exception in getQuotationById:', err)
    return { error: err.message || 'Failed to fetch quotation' }
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
  revision_number?: number
  currency?: string
}) {
  const supabase = createAdminClient()
  const rev = data.revision_number || 0

  // Embed revision & currency metadata in items_json so it survives even if DB table lacks column
  const enrichedItems = Array.isArray(data.items_json)
    ? data.items_json.map((it, idx) => (idx === 0 ? { ...it, _rev: rev, _currency: data.currency || 'INR' } : it))
    : data.items_json

  let insertData: any = {
    quotation_number: data.quotation_number,
    created_by: data.created_by,
    customer_name: data.customer_name,
    customer_company: data.customer_company || null,
    customer_phone: data.customer_phone || null,
    customer_email: data.customer_email || null,
    customer_address: data.customer_address || null,
    items_json: enrichedItems,
    subtotal: data.subtotal,
    tax_amount: data.tax_amount,
    total_amount: data.total_amount,
    discount_total: data.discount_total,
    grand_total: data.grand_total,
    status: data.status || 'pending',
    revision_number: rev,
  }

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
    quotation = fallback.data ? { ...fallback.data, revision_number: rev } : null
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
      quotation = retryFallback.data ? { ...retryFallback.data, revision_number: rev } : null
      error = retryFallback.error
    } else {
      quotation = retry.data ? { ...retry.data, revision_number: rev } : null
      error = retry.error
    }
  }

  if (error) return { error: error.message }
  revalidatePath('/quotations')
  revalidatePath('/admin/quotations')
  return { data: quotation ? { ...quotation, revision_number: rev } : null }
}

export async function updateQuotation(idOrNumber: string, data: {
  quotation_number?: string
  customer_name: string
  customer_company?: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
  items_json: any[]
  subtotal: number
  tax_amount?: number
  total_amount?: number
  discount_total: number
  grand_total: number
  status?: string
  revision_number: number
  currency?: string
}) {
  if (!idOrNumber) return { error: 'No quotation identifier provided for update' }
  const supabase = createAdminClient()
  const trimmed = idOrNumber.trim()
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)

  // Embed revision & currency metadata in items_json
  const enrichedItems = Array.isArray(data.items_json)
    ? data.items_json.map((it, idx) => (idx === 0 ? { ...it, _rev: data.revision_number, _currency: data.currency || 'INR' } : it))
    : data.items_json

  const updateFields: any = {
    customer_name: data.customer_name,
    customer_company: data.customer_company || null,
    customer_phone: data.customer_phone || null,
    customer_email: data.customer_email || null,
    customer_address: data.customer_address || null,
    items_json: enrichedItems,
    subtotal: data.subtotal,
    discount_total: data.discount_total,
    grand_total: data.grand_total,
    revision_number: data.revision_number,
    ...(data.tax_amount !== undefined ? { tax_amount: data.tax_amount } : {}),
    ...(data.total_amount !== undefined ? { total_amount: data.total_amount } : {}),
    ...(data.status ? { status: data.status } : {}),
    ...(data.quotation_number ? { quotation_number: data.quotation_number } : {})
  }

  let updateQuery = supabase.from('quotations').update(updateFields)
  if (isUUID) {
    updateQuery = updateQuery.eq('id', trimmed)
  } else {
    updateQuery = updateQuery.eq('quotation_number', trimmed)
  }

  let { data: quotation, error } = await updateQuery.select().single()

  if (error && error.message?.includes('revision_number')) {
    const { revision_number, ...fallbackFields } = updateFields
    let fallbackQuery = supabase.from('quotations').update(fallbackFields)
    if (isUUID) {
      fallbackQuery = fallbackQuery.eq('id', trimmed)
    } else {
      fallbackQuery = fallbackQuery.eq('quotation_number', trimmed)
    }
    const fallback = await fallbackQuery.select().single()
    quotation = fallback.data ? { ...fallback.data, revision_number: data.revision_number } : null
    error = fallback.error
  }

  if (error) return { error: error.message }
  revalidatePath('/quotations')
  revalidatePath('/admin/quotations')
  return { data: quotation ? { ...quotation, revision_number: data.revision_number } : null }
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

export async function deleteQuotation(id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('quotations')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/quotations')
  revalidatePath('/admin/quotations')
  return { success: true }
}
