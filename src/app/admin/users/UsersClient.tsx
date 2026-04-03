"use client"

import { useState, useEffect } from "react"
import { Plus, Search, MoreHorizontal, Power, PowerOff, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  active: boolean
  created_at: string
  phone: string | null
}

export default function UsersClient({ initialUsers }: { initialUsers: Profile[] }) {
  const router = useRouter()
  const [users, setUsers] = useState<Profile[]>(initialUsers)
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "sales", phone: "" })

  // Keep local state in sync if initialUsers prop changes (e.g., server re-render)
  useEffect(() => {
    setUsers(initialUsers)
  }, [initialUsers])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      // Get the current session token so the API works in Safari (ITP blocks cookies)
      const { data: { session } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          phone: formData.phone
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create user')

      // Optimistically add the new user to local state so Safari sees it immediately
      const newUser: Profile = {
        id: data.id || `temp-${Date.now()}`,
        full_name: formData.name,
        email: formData.email,
        role: formData.role,
        active: true,
        created_at: new Date().toISOString(),
        phone: formData.phone || null,
      }
      setUsers((prev) => [newUser, ...prev])

      toast.success("User created successfully")
      setIsCreateOpen(false)
      setFormData({ name: "", email: "", password: "", role: "sales", phone: "" })
      // Also trigger server refresh so the correct ID is loaded
      router.refresh()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  async function handleToggle(user: Profile) {
    const newActive = !user.active
    const { error } = await supabase.from("profiles").update({ active: newActive }).eq("id", user.id)
    if (error) {
      toast.error(error.message)
    } else {
      // Update local state immediately (Safari-safe)
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, active: newActive } : u))
      toast.success("User status updated")
      router.refresh()
    }
  }

  async function handleDelete(user: Profile) {
    if (!confirm(`Delete ${user.full_name}? This cannot be undone.`)) return
    const { error } = await supabase.from("profiles").delete().eq("id", user.id)
    if (error) {
      toast.error(error.message)
    } else {
      // Remove from local state immediately (Safari-safe)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      toast.success("User deleted")
      router.refresh()
    }
  }

  const filtered = users.filter(
    (u) => u.full_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) || u.email?.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Users</h1>
          <p className="text-sm text-gray-400">Manage your sales team and administrators.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-black/90 transition-all">
              <Plus className="h-4 w-4" /> Add User
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] rounded-2xl p-8">
            <form onSubmit={handleCreate} className="space-y-6">
              <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
              <div className="space-y-2"><Label>Full Name</Label>
                <Input required onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label>
                <Input type="email" required onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Phone</Label>
                <Input required onChange={(e) => setFormData({ ...formData, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Password</Label>
                <Input type="password" required onChange={(e) => setFormData({ ...formData, password: e.target.value })} /></div>
              <div className="space-y-2"><Label>Role</Label>
                <Select defaultValue="sales" onValueChange={(v) => setFormData({ ...formData, role: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <button type="submit" className="w-full rounded-xl bg-black py-3 text-white font-bold">Create User</button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input placeholder="Search users..." className="pl-9 h-12 rounded-xl" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id} className="hover:bg-gray-50 transition">
                <TableCell>
                  <div className="font-bold">{user.full_name}</div>
                  <div className="text-xs text-gray-400">{user.email}</div>
                </TableCell>
                <TableCell>
                  <Badge className={user.role === "admin" ? "bg-black text-white" : "bg-gray-100 text-gray-600"}>{user.role}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.active ? "default" : "destructive"}>{user.active ? "Active" : "Inactive"}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 rounded-lg hover:bg-gray-100 transition"><MoreHorizontal className="h-4 w-4" /></button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl shadow-xl">
                      <DropdownMenuItem onClick={() => handleToggle(user)}>
                        {user.active
                          ? <><PowerOff className="mr-2 h-4 w-4 text-red-500" />Deactivate</>
                          : <><Power className="mr-2 h-4 w-4 text-green-500" />Activate</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(user)} className="text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" />Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
