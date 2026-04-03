import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sgsasisyljbubutjzvhb.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnc2FzaXN5bGpidWJ1dGp6dmhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MzY1MjksImV4cCI6MjA4NzQxMjUyOX0.OkKGzRwcAsITrcMih2qwupQyHJAGhU7axnoXk8Rk85U'

async function testAll() {
  const client = createClient(supabaseUrl, supabaseAnonKey)

  console.log('Testing Products with full payload...')
  const productPayload = {
    name: "Full Test Product",
    description: "test", 
    price: 100, 
    tax_percent: 18, 
    active: true, 
    image_url: null, 
    category: "test", 
    sku: "TEST-01", 
    addons: [], 
    line_items: [], 
    specs: [], 
    features: [], 
    image_format: "wide"
  }
  const { error: pError } = await client.from('products').insert(productPayload)
  console.log('Products Insert Error:', pError?.message || 'Success')

  console.log('\nTesting Categories...')
  const { error: cError } = await client.from('categories').insert({ name: 'Test Category' })
  console.log('Categories Insert Error:', cError?.message || 'Success')

  console.log('\nTesting Quotations...')
  const { error: qError } = await client.from('quotations').insert({
    quotation_number: 'TEST-001',
    customer_name: 'test',
    customer_phone: '123',
    customer_email: 'test@test.com',
    customer_address: 'test',
    items_json: [],
    subtotal: 0,
    tax_total: 0,
    discount_total: 0,
    grand_total: 0,
  })
  console.log('Quotations Insert Error:', qError?.message || 'Success')
}

testAll()
