'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Loader2 } from 'lucide-react'
import { createSalesperson } from './actions'
import { toast } from 'sonner'

export default function CreateUserDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [role, setRole] = useState('sales')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.append('role', role)

    const result = await createSalesperson(formData)

    setIsLoading(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('User created successfully')
      setOpen(false)
      e.currentTarget.reset()
      setRole('sales')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-black hover:bg-gray-800 text-white px-6 py-3">
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px] rounded-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              Create New User
            </DialogTitle>
            <DialogDescription>
              Add a new admin or sales member.
            </DialogDescription>
          </DialogHeader>

          {/* FULL NAME */}
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input name="name" placeholder="John Doe" required />
          </div>

          {/* EMAIL */}
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              name="email"
              type="email"
              placeholder="john@example.com"
              required
            />
          </div>

          {/* PHONE */}
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              name="phone"
              type="text"
              placeholder="+91 9876543210"
              required
            />
          </div>

          {/* PASSWORD */}
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>

          {/* ROLE */}
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
              className="bg-black hover:bg-gray-800 text-white w-full py-3"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
