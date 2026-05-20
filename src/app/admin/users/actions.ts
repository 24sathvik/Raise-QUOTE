'use server'

import { createAdminClient } from '@/lib/supabase/admin'

/* =====================================================
   CREATE USER (Admin or Sales)
===================================================== */
export async function createSalesperson(formData: FormData) {
  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string
    const phone = formData.get('phone') as string
    const role = formData.get('role') as string

    if (!email || !password || !name || !phone || !role) {
      return { error: 'All fields are required.' }
    }

    const supabaseAdmin = createAdminClient()

    // Check if auth user already exists
    const { data: existingAuth } =
      await supabaseAdmin.auth.admin.listUsers()

    const alreadyExists = existingAuth?.users?.find(
      (u) => u.email === email
    )

    if (alreadyExists) {
      return { error: 'A user with this email already exists.' }
    }

    // Create Auth user
    const { data: authUser, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name }
      })

    if (authError) {
      return { error: authError.message }
    }

    if (!authUser?.user) {
      return { error: 'Failed to create auth user.' }
    }

    // Upsert profile row — use upsert instead of insert to handle the case
    // where a Supabase auth trigger has already created a profile row,
    // which would cause a duplicate key violation on profiles_pkey.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        full_name: name,
        email,
        phone,
        role,
        active: true
      }, { onConflict: 'id' })

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return { error: profileError.message }
    }

    return { success: true }

  } catch (err: any) {
    return { error: err.message || 'Unexpected error occurred.' }
  }
}


/* =====================================================
   TOGGLE USER STATUS
===================================================== */
export async function toggleUserStatus(userId: string, active: boolean) {
  try {
    const supabaseAdmin = createAdminClient()

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ active })
      .eq('id', userId)

    if (error) {
      return { error: error.message }
    }

    return { success: true }

  } catch (err: any) {
    return { error: err.message }
  }
}


/* =====================================================
   RESET USER PASSWORD
===================================================== */
export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    if (!newPassword) {
      return { error: 'Password cannot be empty.' }
    }

    const supabaseAdmin = createAdminClient()

    const { error } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      })

    if (error) {
      return { error: error.message }
    }

    return { success: true }

  } catch (err: any) {
    return { error: err.message }
  }
}


/* =====================================================
   DELETE USER (Auth + Profile)
===================================================== */
export async function deleteUser(userId: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // Nullify created_by on quotations belonging to this user so FK constraint
    // does not block auth user deletion. The quotations are preserved.
    await supabaseAdmin
      .from('quotations')
      .update({ created_by: null })
      .eq('created_by', userId)

    const { error: authError } =
      await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authError) {
      // Fallback: if auth deletion fails, at least deactivate the profile
      await supabaseAdmin
        .from('profiles')
        .update({ active: false })
        .eq('id', userId)
      return { error: `Could not delete auth account: ${authError.message}. User has been deactivated instead.` }
    }

    // Delete profile after auth user is gone
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (profileError) {
      return { error: profileError.message }
    }

    return { success: true }

  } catch (err: any) {
    return { error: err.message }
  }
}
