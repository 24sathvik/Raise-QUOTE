"use client"

import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Plus, Search, Key, Power, PowerOff, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Profile {
  id: string
  full_name: string
  email: string
  role: string
  active: boolean
  created_at: string
  phone: string | null
}

export default function UsersPage() {
  const supabase = createClient()

  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isResetOpen, setIsResetOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "sales",
    phone: "",
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) toast.error(error.message)
    else setUsers(data || [])

    setLoading(false)
  }

  /* ================= CREATE USER ================= */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()

    const { data: authData, error: authError } =
      await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { name: formData.name },
        },
      })

    if (authError) {
      toast.error(authError.message)
      return
    }

    if (!authData.user) {
      toast.error("Failed to create user")
      return
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: authData.user.id,
      full_name: formData.name,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      active: true,
    })

    if (profileError) {
      toast.error(profileError.message)
      return
    }

    toast.success("User created successfully")
    setIsCreateOpen(false)
    fetchUsers()
  }

  /* ================= TOGGLE STATUS ================= */
  async function handleToggle(user: Profile) {
    const { error } = await supabase
      .from("profiles")
      .update({ active: !user.active })
      .eq("id", user.id)

    if (error) toast.error(error.message)
    else {
      toast.success("User status updated")
      fetchUsers()
    }
  }

  /* ================= DELETE USER ================= */
  async function handleDelete(user: Profile) {
    if (!confirm("Are you sure?")) return

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id)

    if (error) toast.error(error.message)
    else {
      toast.success("User deleted")
      fetchUsers()
    }
  }

  /* ================= RESET PASSWORD ================= */
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser) return

    const { error } = await supabase.auth.updateUser({
      password: formData.password,
    })

    if (error) toast.error(error.message)
    else {
      toast.success("Password updated")
      setIsResetOpen(false)
    }
  }

  const filtered = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Users</h1>

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-bold text-white">
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[520px] rounded-2xl p-8">
            <form onSubmit={handleCreate} className="space-y-6">
              <DialogHeader>
                <DialogTitle>Create User</DialogTitle>
              </DialogHeader>

              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  defaultValue="sales"
                  onValueChange={(v) =>
                    setFormData({ ...formData, role: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <button
                  type="submit"
                  className="w-full bg-black text-white rounded-xl py-3"
                >
                  Create User
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <Input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {filtered.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="font-bold">{user.full_name}</div>
                <div className="text-xs text-gray-400">
                  {user.email}
                </div>
              </TableCell>

              <TableCell>
                <Badge>{user.role}</Badge>
              </TableCell>

              <TableCell>
                {user.active ? "Active" : "Inactive"}
              </TableCell>

              <TableCell className="flex gap-3">
                <button onClick={() => handleToggle(user)}>
                  {user.active ? (
                    <PowerOff className="h-4 w-4" />
                  ) : (
                    <Power className="h-4 w-4" />
                  )}
                </button>

                <button onClick={() => handleDelete(user)}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
