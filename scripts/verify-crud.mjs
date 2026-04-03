import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sgsasisyljbubutjzvhb.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNnc2FzaXN5bGpidWJ1dGp6dmhiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTgzNjUyOSwiZXhwIjoyMDg3NDEyNTI5fQ.mvkbj8rTKAv5DNh5Oiqw0XGGxobLcYdFX-MJjLMxeZc'

async function verifyAndCleanup() {
  const client = createClient(supabaseUrl, supabaseServiceKey)

  // Check if test category exists
  const { data: cats } = await client.from('categories').select('*').ilike('name', '%AutoTest%')
  console.log('AutoTest categories still in DB:', cats?.length, cats?.map(c => c.name))

  // Check if test product exists
  const { data: prods } = await client.from('products').select('*').ilike('name', '%AutoTest%')
  console.log('AutoTest products still in DB:', prods?.length, prods?.map(p => p.name))

  // Check test users
  const { data: users } = await client.from('profiles').select('*').eq('email', 'testbot999@test.com')
  console.log('Test Bot user in DB:', users?.length, users?.map(u => u.full_name))

  // Now manually delete them to clean up
  if (cats?.length) {
    for (const cat of cats) {
      const { error } = await client.from('categories').delete().eq('id', cat.id)
      console.log(`Deleted category "${cat.name}":`, error ? error.message : 'OK')
    }
  }

  if (prods?.length) {
    for (const prod of prods) {
      const { error } = await client.from('products').delete().eq('id', prod.id)
      console.log(`Deleted product "${prod.name}":`, error ? error.message : 'OK')
    }
  }

  if (users?.length) {
    for (const user of users) {
      // Delete auth user too
      const { error: authErr } = await client.auth.admin.deleteUser(user.id)
      console.log(`Deleted auth user "${user.full_name}":`, authErr ? authErr.message : 'OK')
      const { error: profileErr } = await client.from('profiles').delete().eq('id', user.id)
      console.log(`Deleted profile "${user.full_name}":`, profileErr ? profileErr.message : 'OK')
    }
  }
}

verifyAndCleanup().catch(console.error)
