'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Plus } from 'lucide-react'
import { createSalesperson } from './actions'
import { toast } from 'sonner'

export default function CreateUserDialog() {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState('sales')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Capture the form element BEFORE any await — e.currentTarget becomes
    // null after React's synthetic event is recycled across the async gap.
    const form = e.currentTarget
    setLoading(true)

    const formData = new FormData(form)
    formData.append('role', role)

    try {
      const result = await createSalesperson(formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('User created successfully')
        setOpen(false)
        form.reset()
        setRole('sales')
      }
    } catch (err: any) {
      toast.error(err.message || 'Unexpected error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-black text-white hover:bg-gray-800 transition-all">
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">

          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Create New User
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input name="name" required />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input name="email" type="email" required />
          </div>

          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input name="phone" required />
          </div>

          <div className="space-y-2">
            <Label>Password</Label>
            <Input name="password" type="password" required />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
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
            <Button
              type="submit"
              className="w-full bg-black text-white hover:bg-gray-800"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  )
}
