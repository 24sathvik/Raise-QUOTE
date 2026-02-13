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
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setLoading(false)
        return
      }

      setUserId(session.user.id)

      // Fetch role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()

      if (!profile) {
        toast.error("User profile not found")
        setLoading(false)
        return
      }

      setRole(profile.role)

      await fetchQuotations(session.user.id, profile.role)
      setLoading(false)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      init()
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const fetchQuotations = async (uid: string, userRole: string) => {
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

    if (userRole !== "admin") {
      query = query.eq("created_by", uid)
    }

    const { data, error } = await query

    if (error) {
      toast.error(error.message)
      return
    }

    setQuotations(data as any)
  }

  const handleRefresh = async () => {
    if (!userId || !role) return
    setRefreshing(true)
    await fetchQuotations(userId, role)
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
            className="flex h-10 w-10 items-center justify-center rounded-xl border bg-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black">
              {role === "admin" ? "All Quotations" : "My Quotations"}
            </h1>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            <TableHead>Customer</TableHead>
            {role === "admin" && <TableHead>Salesperson</TableHead>}
            <TableHead>Amount</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>PDF</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6}>Loading...</TableCell>
            </TableRow>
          ) : filteredQuotations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6}>No quotations found</TableCell>
            </TableRow>
          ) : (
            filteredQuotations.map((q) => (
              <TableRow key={q.id}>
                <TableCell>{q.quotation_number}</TableCell>
                <TableCell>{q.customer_name}</TableCell>
                {role === "admin" && (
                  <TableCell>{q.profiles?.full_name}</TableCell>
                )}
                <TableCell>₹{q.grand_total}</TableCell>
                <TableCell>
                  {new Date(q.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {q.pdf_url && (
                    <a href={q.pdf_url} target="_blank">
                      <Download className="h-4 w-4" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
