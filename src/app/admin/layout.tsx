import {
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect("/auth/login")
  }

  const user = session.user

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile && profile.role !== "admin") {
    redirect("/")
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gray-50/50">
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex flex-1 flex-col">
          
          {/* Mobile Header */}
          <div className="flex items-center justify-between border-b bg-white px-4 py-3 md:hidden">
            <SidebarTrigger />
            <span className="font-semibold">Admin Panel</span>
          </div>

          {/* Page Content */}
          <div className="flex-1 p-4 md:p-8">
            <div className="mx-auto w-full max-w-7xl">
              {children}
            </div>
          </div>

        </main>
      </div>
    </SidebarProvider>
  )
}
