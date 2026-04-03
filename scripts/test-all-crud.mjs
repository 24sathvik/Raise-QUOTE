import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sgsasisyljbubutjzvhb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnc2FzaXN5bGpidWJ1dGp6dmhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgzNjUyOSwiZXhwIjoyMDg3NDEyNTI5fQ.mvkbj8rTKAv5DNh5Oiqw0XGGxobLcYdFX-MJjLMxeZc'

async function testAll() {
  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  console.log('\n=== PRODUCTS CRUD ===')
  // Insert
  const { data: inserted, error: insertErr } = await client.from('products').insert({
    name: 'CrudTest', price: 100, tax_percent: 18, description: '', sku: 'CT-01', category: 'test', active: true, addons: [], specs: [], features: [], line_items: [], image_format: 'wide'
  }).select().single()
  console.log('Insert:', insertErr ? insertErr.message : `OK (id=${inserted?.id})`)

  if (inserted) {
    // Update
    const { error: updateErr } = await client.from('products').update({ name: 'CrudTest Updated' }).eq('id', inserted.id)
    console.log('Update:', updateErr ? updateErr.message : 'OK')

    // Delete
    const { error: deleteErr } = await client.from('products').delete().eq('id', inserted.id)
    console.log('Delete:', deleteErr ? deleteErr.message : 'OK')
  }

  console.log('\n=== CATEGORIES CRUD ===')
  const { data: cat, error: catInsertErr } = await client.from('categories').insert({ name: 'CrudTestCat' }).select().single()
  console.log('Insert:', catInsertErr ? catInsertErr.message : `OK (id=${cat?.id})`)
  if (cat) {
    const { error: catUpdateErr } = await client.from('categories').update({ name: 'CrudTestCat Updated' }).eq('id', cat.id)
    console.log('Update:', catUpdateErr ? catUpdateErr.message : 'OK')
    const { error: catDeleteErr } = await client.from('categories').delete().eq('id', cat.id)
    console.log('Delete:', catDeleteErr ? catDeleteErr.message : 'OK')
  }

  console.log('\n=== QUOTATIONS CRUD ===')
  const { data: quot, error: quotInsertErr } = await client.from('quotations').insert({
    quotation_number: 'CRUD-TEST-001', customer_name: 'Test', items_json: [], subtotal: 100, tax_amount: 0, total_amount: 100, grand_total: 100
  }).select().single()
  console.log('Insert:', quotInsertErr ? quotInsertErr.message : `OK (id=${quot?.id})`)
  if (quot) {
    const { error: quotUpdateErr } = await client.from('quotations').update({ status: 'approved' }).eq('id', quot.id)
    console.log('Update status:', quotUpdateErr ? quotUpdateErr.message : 'OK')
    const { error: quotDeleteErr } = await client.from('quotations').delete().eq('id', quot.id)
    console.log('Delete:', quotDeleteErr ? quotDeleteErr.message : 'OK')
  }

  console.log('\n=== USERS CRUD ===')
  // Create
  const { data: authUser, error: authErr } = await client.auth.admin.createUser({
    email: 'crudtest_verify@test.com', password: 'Test@1234', email_confirm: true, user_metadata: { name: 'CrudTest' }
  })
  console.log('Auth Create:', authErr ? authErr.message : `OK (id=${authUser?.user?.id})`)
  if (authUser?.user) {
    const { error: profileErr } = await client.from('profiles').insert({ id: authUser.user.id, full_name: 'CrudTest', email: 'crudtest_verify@test.com', phone: '0000000000', role: 'sales', active: true })
    console.log('Profile Insert:', profileErr ? profileErr.message : 'OK')

    const { error: toggleErr } = await client.from('profiles').update({ active: false }).eq('id', authUser.user.id)
    console.log('Profile Toggle:', toggleErr ? toggleErr.message : 'OK')

    // Delete auth  
    const { error: authDeleteErr } = await client.auth.admin.deleteUser(authUser.user.id)
    console.log('Auth Delete:', authDeleteErr ? JSON.stringify(authDeleteErr) : 'OK')

    const { error: profileDeleteErr } = await client.from('profiles').delete().eq('id', authUser.user.id)
    console.log('Profile Delete:', profileDeleteErr ? profileDeleteErr.message : 'OK')
  }
}

testAll().catch(console.error)
