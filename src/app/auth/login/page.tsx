'use client'

import { useState } from 'react'
import { loginAction } from './actions'
import { toast } from 'sonner'
import { ArrowRight, Loader2, Lock, Mail } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const handleLogin = async (formData: FormData) => {
    setLoading(true)
    const result = await loginAction(formData)
    if (result?.error) {
      toast.error(result.error)
      setLoading(false)
    }
    // no need to redirect — server action handles it
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] p-6">
      <div className="w-full max-w-[440px] space-y-8 rounded-3xl bg-white p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-black text-white shadow-lg">
            <span className="text-2xl font-black">R</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-black">Welcome Back</h1>
          <p className="text-muted-foreground">Sign in to your Raise Labs account</p>
        </div>

        <form action={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="email"
                  name="email"
                  placeholder="name@company.com"
                  className="h-12 border-gray-100 bg-gray-50/30 pl-10 focus:border-black focus:ring-0"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="password"
                  name="password"
                  placeholder="••••••••"
                  className="h-12 border-gray-100 bg-gray-50/30 pl-10 focus:border-black focus:ring-0"
                  required
                />
              </div>
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="group relative flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-black font-semibold text-white transition-all hover:bg-black/90 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="pt-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
            Proprietary System of Raise Labs
          </p>
        </div>
      </div>
    </div>
  )
}
