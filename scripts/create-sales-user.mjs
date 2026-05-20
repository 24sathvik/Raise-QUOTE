import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bcvcpvnpumxgwzznfsas.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjdmNwdm5wdW14Z3d6em5mc2FzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODY2Mzg2MiwiZXhwIjoyMDk0MjM5ODYyfQ.eXgC_rOMNCe8HMz9qmEcGC5eABMnWSazRe2HiH0PmeA'

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createSalesUser() {
  const email = 'rahul@raiselabequip.com'
  const password = 'Rahul@2026'
  const name = 'Rahul'
  const role = 'sales'

  console.log(`Creating sales user: ${email} ...`)

  // Check if user already exists in auth
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) {
    console.error('List error:', listError.message)
    process.exit(1)
  }

  const existingUser = users.find(u => u.email === email)
  let userId

  if (existingUser) {
    console.log('Auth user already exists, using existing user ID...')
    userId = existingUser.id
  } else {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role }
    })

    if (authError) {
      console.error('Auth error:', authError.message)
      process.exit(1)
    }

    userId = authData.user.id
    console.log('Auth user created.')
  }

  console.log(`User ID: ${userId}`)
  console.log('Upserting profile...')

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      full_name: name,
      email,
      role,
      active: true
    }, { onConflict: 'id' })

  if (profileError) {
    console.error('Profile error:', profileError.message)
    process.exit(1)
  }

  console.log('✅ Sales user created successfully!')
  console.log(`   Email   : ${email}`)
  console.log(`   Password: ${password}`)
  console.log(`   Role    : ${role}`)
}

createSalesUser()
