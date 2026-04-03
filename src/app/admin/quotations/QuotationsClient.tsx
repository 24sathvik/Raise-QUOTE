"use client"

import { useState, useRef } from "react"
import { Search, Calendar, User, Download, ChevronDown, ArrowUp, ArrowDown, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export type QuotationStatus = 'pending' | 'negotiating' | 'approved' | 'rejected' | 'on_hold'

interface Quotation {
  id: string
  quotation_number: string
  customer_name: string
  customer_company: string | null
  customer_phone: string | null
  customer_email: string | null
  grand_total: number
  created_at: string
  pdf_url: string | null
  status: QuotationStatus
  profiles: { full_name: string }
}

const statusColors: Record<QuotationStatus, string> = {
  pending: "bg-gray-100 text-gray-800 hover:bg-gray-200 border-gray-200",
  negotiating: "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200",
  approved: "bg-green-100 text-green-800 hover:bg-green-200 border-green-200",
  rejected: "bg-red-100 text-red-800 hover:bg-red-200 border-red-200",
  on_hold: "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200",
}

const statusLabels: Record<QuotationStatus, string> = {
  pending: "Pending",
  negotiating: "Negotiating",
  approved: "Approved",
  rejected: "Rejected",
  on_hold: "On Hold",
}

export default function QuotationsClient({ initialQuotations, activeFilters }: { initialQuotations: Quotation[], activeFilters?: { month?: string, year?: string, status?: string } }) {
  const [search, setSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const isMutating = useRef(false)
  
  const [sortField, setSortField] = useState<'created_at' | 'grand_total' | 'status' | 'customer_name' | 'salesperson'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const router = useRouter()

  const filtered = initialQuotations.filter(
    (q) =>
      q.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      q.quotation_number?.toLowerCase().includes(search.toLowerCase()) ||
      q.profiles?.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  const statusOrder = { approved: 0, negotiating: 1, pending: 2, on_hold: 3, rejected: 4 }

  const sorted = [...filtered].sort((a, b) => {
    let valA: any, valB: any
    if (sortField === 'salesperson') {
      valA = a.profiles?.full_name || ''
      valB = b.profiles?.full_name || ''
    } else if (sortField === 'status') {
      valA = statusOrder[a.status as keyof typeof statusOrder] ?? 99
      valB = statusOrder[b.status as keyof typeof statusOrder] ?? 99
      return sortDir === 'asc' ? valA - valB : valB - valA
    } else {
      valA = (a as any)[sortField]
      valB = (b as any)[sortField]
    }
    if (typeof valA === 'string') return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    return sortDir === 'asc' ? valA - valB : valB - valA
  })

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 inline-block ml-1" /> : <ArrowDown className="w-3 h-3 inline-block ml-1" />
  }

  const activeFilterCount = Object.values(activeFilters || {}).filter(Boolean).length
  const filterSummary = activeFilters?.month && activeFilters?.year 
    ? `Showing quotations for ${new Date(Number(activeFilters.year), Number(activeFilters.month) - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`
    : activeFilters?.status === 'pending_negotiating'
    ? `Showing Pending / Negotiating quotations`
    : activeFilters?.status
    ? `Showing ${statusLabels[activeFilters.status as QuotationStatus]} quotations`
    : null

  const handleStatusChange = async (id: string, newStatus: QuotationStatus) => {
    if (isMutating.current) return
    isMutating.current = true
    setUpdatingId(id)
    try {
      const { error } = await supabase
        .from('quotations')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      
      toast.success("Status updated successfully")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update status")
    } finally {
      isMutating.current = false
      setUpdatingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Quotation Tracking</h1>
        <p className="text-muted-foreground">Monitor all quotations generated by your sales team.</p>
      </div>
      {activeFilterCount > 0 && (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 border border-amber-200">
          <span className="font-semibold text-sm text-amber-800">{filterSummary}</span>
          <button 
            onClick={() => router.push('/admin/quotations')}
            className="flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-200 transition-colors"
          >
            Clear Filter <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by customer, number, or salesperson..."
            className="pl-9 h-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="md:hidden flex items-center gap-2">
          <span className="text-sm font-semibold whitespace-nowrap text-gray-500">Sort by:</span>
          <Select value={`${sortField}-${sortDir}`} onValueChange={(val) => {
            const [f, d] = val.split('-') as [typeof sortField, 'asc' | 'desc']
            setSortField(f)
            setSortDir(d)
          }}>
            <SelectTrigger className="h-10 bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at-desc">Date (Newest)</SelectItem>
              <SelectItem value="created_at-asc">Date (Oldest)</SelectItem>
              <SelectItem value="grand_total-desc">Amount (Highest)</SelectItem>
              <SelectItem value="grand_total-asc">Amount (Lowest)</SelectItem>
              <SelectItem value="status-desc">Status (Approved first)</SelectItem>
              <SelectItem value="customer_name-asc">Customer A-Z</SelectItem>
              <SelectItem value="salesperson-asc">Salesperson A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow>
                <TableHead className="whitespace-nowrap">Number</TableHead>
                <TableHead className="whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('customer_name')}>
                  Customer <SortIcon field="customer_name" />
                </TableHead>
                <TableHead className="whitespace-nowrap">Company</TableHead>
                <TableHead className="whitespace-nowrap">Phone</TableHead>
                <TableHead className="whitespace-nowrap">Email</TableHead>
                <TableHead className="whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('salesperson')}>
                  Salesperson <SortIcon field="salesperson" />
                </TableHead>
                <TableHead className="whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('grand_total')}>
                  Amount <SortIcon field="grand_total" />
                </TableHead>
                <TableHead className="whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                  Status <SortIcon field="status" />
                </TableHead>
                <TableHead className="whitespace-nowrap cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('created_at')}>
                  Date <SortIcon field="created_at" />
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">No quotations found.</TableCell>
                </TableRow>
              ) : (
                sorted.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-mono text-xs font-semibold">{q.quotation_number}</TableCell>
                    <TableCell><div className="font-medium">{q.customer_name}</div></TableCell>
                    <TableCell><div className="text-xs text-gray-500">{q.customer_company || "—"}</div></TableCell>
                    <TableCell><div className="text-xs text-gray-500">{q.customer_phone || "—"}</div></TableCell>
                    <TableCell><div className="text-xs text-gray-500">{q.customer_email || "—"}</div></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{q.profiles?.full_name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">₹{q.grand_total?.toLocaleString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger disabled={updatingId === q.id} className="focus:outline-none disabled:opacity-50">
                          <Badge variant="outline" className={`flex items-center gap-1 cursor-pointer transition-colors ${statusColors[q.status || 'pending']}`}>
                            {statusLabels[q.status || 'pending']}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {(Object.keys(statusLabels) as QuotationStatus[]).map((status) => (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => handleStatusChange(q.id, status)}
                              className="cursor-pointer font-medium"
                            >
                              <div className={`w-2 h-2 rounded-full mr-2 ${status === 'pending' ? 'bg-gray-500' : status === 'negotiating' ? 'bg-blue-500' : status === 'approved' ? 'bg-green-500' : status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />
                              {statusLabels[status]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        <span suppressHydrationWarning className="text-xs">{new Date(q.created_at).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {q.pdf_url && (
                        <a href={q.pdf_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-xs font-medium transition-colors hover:bg-gray-50">
                          <Download className="h-3 w-3" /> View PDF
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
