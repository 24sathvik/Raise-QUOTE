import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  console.log('👤 USER:', user?.id, '| ERROR:', error?.message)

  if (error || !user) {
    console.log('❌ Redirecting — no user')
    redirect("/auth/login")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  console.log('📋 PROFILE:', profile, '| PROFILE ERROR:', profileError?.message)

  if (!profile || profile.role !== "admin") {
    console.log('❌ Redirecting — no profile or not admin')
    redirect("/")
  }

  console.log('✅ Auth passed, rendering admin layout')

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50/50">
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto lg:pl-64 transition-all duration-300">
          <div className="sticky top-0 z-10 flex items-center gap-3 bg-white px-4 py-3 border-b md:hidden">
            <SidebarTrigger />
            <span className="font-semibold">Raise Labs Admin</span>
          </div>
          <div className="p-4 md:p-8">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
