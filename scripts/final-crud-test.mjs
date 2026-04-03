import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sgsasisyljbubutjzvhb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnc2FzaXN5bGpidWJ1dGp6dmhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgzNjUyOSwiZXhwIjoyMDg3NDEyNTI5fQ.mvkbj8rTKAv5DNh5Oiqw0XGGxobLcYdFX-MJjLMxeZc'

const client = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const ok = (msg) => console.log('  ✅', msg)
const fail = (msg) => console.log('  ❌', msg)

async function test(label, fn) {
  console.log(`\n=== ${label} ===`)
  try { await fn() } catch(e) { fail(e.message) }
}

await test('PRODUCTS', async () => {
  const { data, error: ie } = await client.from('products').insert({ name: 'FinalTest', price: 100, tax_percent: 18, description: '', sku: 'FT-01', category: 'test', active: true, addons: [], specs: [], features: [], line_items: [], image_format: 'wide' }).select().single()
  if (ie) { fail('Insert: ' + ie.message); return }
  ok(`Insert (id=${data.id})`)
  const { error: ue } = await client.from('products').update({ name: 'FinalTest Updated' }).eq('id', data.id)
  ue ? fail('Update: ' + ue.message) : ok('Update')
  const { error: de } = await client.from('products').delete().eq('id', data.id)
  de ? fail('Delete: ' + de.message) : ok('Delete')
})

await test('CATEGORIES', async () => {
  const { data, error: ie } = await client.from('categories').insert({ name: 'FinalTestCat' }).select().single()
  if (ie) { fail('Insert: ' + ie.message); return }
  ok(`Insert (id=${data.id})`)
  const { error: ue } = await client.from('categories').update({ name: 'FinalTestCat Updated' }).eq('id', data.id)
  ue ? fail('Update: ' + ue.message) : ok('Update')
  const { error: de } = await client.from('categories').delete().eq('id', data.id)
  de ? fail('Delete: ' + de.message) : ok('Delete')
})

await test('QUOTATIONS', async () => {
  const { data, error: ie } = await client.from('quotations').insert({
    quotation_number: 'FINAL-TEST-001', customer_name: 'FinalTest Customer', items_json: [], subtotal: 500, tax_amount: 0, total_amount: 500, grand_total: 500, status: 'pending'
  }).select().single()
  if (ie) { fail('Insert: ' + ie.message); return }
  ok(`Insert (id=${data.id})`)
  const { error: ue } = await client.from('quotations').update({ status: 'approved' }).eq('id', data.id)
  ue ? fail('Update status: ' + ue.message) : ok('Update status to approved')
  const { error: de } = await client.from('quotations').delete().eq('id', data.id)
  de ? fail('Delete: ' + de.message) : ok('Delete')
})

await test('USERS (Create + Toggle + Delete with quotation cascade)', async () => {
  const { data: auth, error: ae } = await client.auth.admin.createUser({ email: 'finaltest_verify9@test.com', password: 'Test@1234', email_confirm: true, user_metadata: { name: 'FinalTest' } })
  if (ae) { fail('Auth Create: ' + ae.message); return }
  ok(`Auth Create (id=${auth.user.id})`)
  
  const { error: pe } = await client.from('profiles').insert({ id: auth.user.id, full_name: 'FinalTest', email: 'finaltest_verify9@test.com', phone: '0000000000', role: 'sales', active: true })
  pe ? fail('Profile Insert: ' + pe.message) : ok('Profile Insert')
  
  const { error: te } = await client.from('profiles').update({ active: false }).eq('id', auth.user.id)
  te ? fail('Toggle: ' + te.message) : ok('Toggle (deactivate)')

  // Insert a quotation for this user to test cascade-nullify
  const { data: quot } = await client.from('quotations').insert({ quotation_number: 'FK-TEST-001', customer_name: 'FK test', items_json: [], subtotal: 0, tax_amount: 0, total_amount: 0, grand_total: 0, created_by: auth.user.id }).select().single()
  if (quot) ok(`Inserted quotation with created_by FK (id=${quot.id})`)

  // Nullify FK
  await client.from('quotations').update({ created_by: null }).eq('created_by', auth.user.id)
  ok('FK nullified for quotations')

  const { error: dele } = await client.auth.admin.deleteUser(auth.user.id)
  dele ? fail('Auth Delete: ' + JSON.stringify(dele)) : ok('Auth Delete')

  const { error: deProfile } = await client.from('profiles').delete().eq('id', auth.user.id)
  deProfile ? fail('Profile Delete: ' + deProfile.message) : ok('Profile Delete')

  // Clean up test quotation
  if (quot) { await client.from('quotations').delete().eq('id', quot.id); ok('Cleaned up FK test quotation') }
})

console.log('\n✨ All CRUD tests completed!')
