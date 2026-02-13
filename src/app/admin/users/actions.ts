export async function createSalesperson(formData: FormData) {
  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const role = formData.get('role') as string

    if (!email || !password || !name || !phone || !role) {
      return { error: 'Missing required fields' }
    }

    const supabaseAdmin = createAdminClient()

    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
      })

    if (authError) return { error: authError.message }

    if (!authUser?.user)
      return { error: 'Failed to create auth user.' }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        full_name: name,
        email,
        phone,
        role,
        active: true
      })

    if (profileError) return { error: profileError.message }

    revalidatePath('/admin/users')
    return { success: true }

  } catch (err: any) {
    return { error: err.message }
  }
}
