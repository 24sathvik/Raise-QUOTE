"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Search, Download, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/client"

interface Quotation {
  id: string
  quotation_number: string
  customer_name: string
  grand_total: number
  created_at: string
  pdf_url: string | null
  profiles: {
    full_name: string
  }
}

export default function QuotationsList() {
  const supabase = createClient()

  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    initialize()
  }, [])

  const initialize = async () => {
    try {
      setLoading(true)

      // 1️⃣ Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        toast.error("Authentication failed")
        return
      }

      // 2️⃣ Fetch role from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

      if (profileError || !profile) {
        toast.error("Unable to verify user role")
        return
      }

      setRole(profile.role)

      // 3️⃣ Fetch quotations based on role
      await fetchQuotations(user.id, profile.role)

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuotations = async (userId: string, userRole: string) => {
    try {
      let query = supabase
        .from("quotations")
        .select(`
          id,
          quotation_number,
          customer_name,
          grand_total,
          created_at,
          pdf_url,
          profiles!created_by (full_name)
        `)
        .order("created_at", { ascending: false })

      // 🔐 Restrict sales users
      if (userRole !== "admin") {
        query = query.eq("created_by", userId)
      }

      const { data, error } = await query

      if (error) throw error

      setQuotations(data as any)

    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await initialize()
    setRefreshing(false)
  }

  const filteredQuotations = quotations.filter(
    (q) =>
      q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.quotation_number?.toLowerCase().includes(search.toLowerCase()) ||
      q.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={role === "admin" ? "/admin/quotations" : "/"}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-black hover:shadow-sm transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-black">
              {role === "admin" ? "All Quotations" : "My Quotations"}
            </h1>
            <p className="text-sm font-medium text-gray-400">
              {role === "admin"
                ? "Monitor all team quotations."
                : "Track your generated quotations."}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="rounded-xl gap-2 font-bold"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by customer or quotation number..."
          className="h-12 rounded-xl border-none bg-white pl-11 shadow-sm ring-1 ring-gray-100 focus:ring-black transition-all"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
        <div className="min-w-[800px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                {role === "admin" && <TableHead>Salesperson</TableHead>}
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={role === "admin" ? 6 : 5}>
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredQuotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={role === "admin" ? 6 : 5}>
                    No quotations found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell>{q.quotation_number}</TableCell>
                    <TableCell>{q.customer_name}</TableCell>

                    {role === "admin" && (
                      <TableCell>{q.profiles?.full_name}</TableCell>
                    )}

                    <TableCell>₹{q.grand_total?.toLocaleString()}</TableCell>
                    <TableCell>
                      {new Date(q.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {q.pdf_url && (
                        <a
                          href={q.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4 inline" />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
