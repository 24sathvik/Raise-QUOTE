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
import type { User } from "@supabase/supabase-js"

interface Quotation {
  id: string
  quotation_number: string
  customer_name: string
  grand_total: number
  created_at: string
  pdf_url: string | null
}

export default function QuotationsList() {
  const supabase = createClient()

  const [user, setUser] = useState<User | null>(null)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const initAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        fetchQuotations(user)
      } else {
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          fetchQuotations(session.user)
        } else {
          setQuotations([])
          setLoading(false)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const fetchQuotations = async (currentUser?: User) => {
    const userToUse = currentUser || user
    
    if (!userToUse) {
      toast.error("Please log in to view quotations")
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from("quotations")
        .select(`
          id,
          quotation_number,
          customer_name,
          grand_total,
          created_at,
          pdf_url
        `)
        .eq("created_by", userToUse.id)
        .order("created_at", { ascending: false })

      if (error) throw error

      setQuotations(data || [])
    } catch (error: any) {
      console.error("Fetch error:", error)
      toast.error(error.message || "Failed to fetch quotations")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    if (!user) {
      toast.error("Please log in first")
      return
    }
    setRefreshing(true)
    fetchQuotations()
  }

  const filteredQuotations = quotations.filter(
    (q) =>
      q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.quotation_number?.toLowerCase().includes(search.toLowerCase())
  )

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Please Log In</h2>
          <p className="text-gray-600">You need to be logged in to view quotations</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-black hover:shadow-sm transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-black">
              My Quotations
            </h1>
            <p className="text-sm font-medium text-gray-400">
              Track your generated quotations.
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
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
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
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : filteredQuotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    {search ? "No matching quotations found." : "No quotations yet. Create your first one!"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotations.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.quotation_number}</TableCell>
                    <TableCell>{q.customer_name}</TableCell>
                    <TableCell className="font-semibold">
                      ₹{q.grand_total?.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      {new Date(q.created_at).toLocaleDateString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      {q.pdf_url ? (
                        
                          href={q.pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-black transition-all"
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">No PDF</span>
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
