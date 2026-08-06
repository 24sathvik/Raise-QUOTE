"use client"

import { useState, useRef, useEffect } from "react"
import { Search, Calendar, User, Download, ChevronDown, ArrowUp, ArrowDown, X, Trash2, Eye, FileText, Pencil, AlertTriangle, Loader2 } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { updateQuotationStatus, deleteQuotation } from "./actions"
import { generateQuotationPDF } from "@/lib/pdf-service"

export type QuotationStatus = 'pending' | 'negotiating' | 'approved' | 'rejected' | 'on_hold'

interface Quotation {
  id: string
  quotation_number: string
  customer_name: string
  customer_company: string | null
  customer_phone: string | null
  customer_email: string | null
  customer_address: string | null
  grand_total: number
  created_at: string
  pdf_url: string | null
  status: QuotationStatus
  items_json: any[] | null
  revision_number?: number
  profiles: { full_name: string }
}

const statusColors: Record<QuotationStatus, string> = {
  pending: "bg-gray-100 text-gray-800 border-gray-200",
  negotiating: "bg-blue-100 text-blue-800 border-blue-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  on_hold: "bg-amber-100 text-amber-800 border-amber-200",
}

const statusLabels: Record<QuotationStatus, string> = {
  pending: "Pending",
  negotiating: "Negotiating",
  approved: "Approved",
  rejected: "Rejected",
  on_hold: "On Hold",
}

export default function QuotationsClient({ initialQuotations, activeFilters, settings }: { initialQuotations: Quotation[], activeFilters?: { month?: string, year?: string, status?: string }, settings?: any }) {
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations)
  const [search, setSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingQuotation, setDeletingQuotation] = useState<Quotation | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const isMutating = useRef(false)
  
  const [sortField, setSortField] = useState<'created_at' | 'grand_total' | 'status' | 'customer_name' | 'salesperson'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const router = useRouter()

  useEffect(() => {
    setQuotations(initialQuotations)
  }, [initialQuotations])

  const filtered = quotations.filter(
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

  const handleStatusChange = async (id: string, newStatus: QuotationStatus) => {
    if (isMutating.current) return
    isMutating.current = true
    setUpdatingId(id)
    try {
      const result = await updateQuotationStatus(id, newStatus)
      if (result?.error) throw new Error(result.error)
      setQuotations(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item))
      toast.success("Status updated successfully")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to update status")
    } finally {
      isMutating.current = false
      setUpdatingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingQuotation) return
    setIsDeleting(true)
    const target = deletingQuotation
    try {
      const result = await deleteQuotation(target.id)
      if (result?.error) throw new Error(result.error)
      setQuotations(prev => prev.filter(q => q.id !== target.id))
      toast.success(`Quotation ${target.quotation_number} deleted successfully`)
      setDeletingQuotation(null)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete quotation")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDownloadPDF = async (q: Quotation) => {
    setDownloadingId(q.id)
    try {
      const rawNumber = (q.quotation_number || 'RLE-101').replace(/\(\d+\)$/, '').trim()
      const revNumber = q.revision_number ? Number(q.revision_number) : 0
      const pdfName = revNumber > 0 ? `${rawNumber}_Quotation(${revNumber}).pdf` : `${rawNumber}_Quotation.pdf`

      if (q.pdf_url) {
        try {
          const res = await fetch(q.pdf_url)
          if (res.ok) {
            const blob = await res.blob()
            const pdfBlob = new Blob([blob], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(pdfBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = pdfName
            document.body.appendChild(a)
            a.click()
            setTimeout(() => {
              window.URL.revokeObjectURL(url)
              if (a.parentNode) document.body.removeChild(a)
            }, 1500)
            toast.success(`Quotation ${q.quotation_number} downloaded`)
            return
          }
        } catch (e) {
          console.warn("Direct blob fetch failed, falling back to generator:", e)
        }
      }

      if (!q.items_json || (Array.isArray(q.items_json) && q.items_json.length === 0)) {
        toast.error("No item data stored to generate PDF")
        return
      }

      const items = Array.isArray(q.items_json)
        ? q.items_json
        : (typeof q.items_json === 'string' ? JSON.parse(q.items_json) : [])

      const currency = items[0]?._currency || 'INR'

      await generateQuotationPDF({
        quotation: q,
        items,
        settings: settings || {},
        user: { full_name: q.profiles?.full_name || 'Admin', role: 'admin' },
        currency
      })
      toast.success(`Quotation ${q.quotation_number} downloaded`)
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PDF")
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-black">Quotations Management</h2>
          <p className="text-xs text-muted-foreground">View, manage, and edit all team quotations</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search customer, number, rep..."
              className="pl-9 h-10 rounded-xl bg-white border-gray-200 text-xs font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-black/90 transition-all whitespace-nowrap"
          >
            New Quotation
          </Link>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50/50">
              <TableRow className="border-gray-100">
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Quote #</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Company</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Sales Rep</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</TableHead>
                <TableHead className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</TableHead>
                <TableHead className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-sm font-bold text-gray-400">
                    {search ? "No matching quotations found." : "No quotations created yet."}
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((q) => (
                  <TableRow key={q.id} className="hover:bg-gray-50/50 transition-colors border-gray-50">
                    <TableCell className="px-6 py-4 font-mono text-xs font-bold text-black">
                      <div className="flex items-center gap-1.5">
                        <span>{q.quotation_number}</span>
                        {q.revision_number && q.revision_number > 0 ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[9px] font-bold px-1.5 py-0">
                            Rev {q.revision_number}
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="text-xs font-bold text-black">{q.customer_name}</div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="text-xs font-medium text-gray-500">{q.customer_company || "—"}</div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                        <User className="h-3 w-3 text-gray-400" />
                        <span>{q.profiles?.full_name || "Unknown"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 font-black text-xs text-black">
                      ₹{q.grand_total?.toLocaleString()}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            disabled={updatingId === q.id}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50 ${statusColors[q.status || 'pending']}`}
                          >
                            {statusLabels[q.status || 'pending']}
                            <ChevronDown className="h-3 w-3 opacity-50" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[180px] rounded-xl p-1.5 shadow-xl border border-gray-100 bg-white">
                          {(Object.keys(statusLabels) as QuotationStatus[]).map((status) => (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => handleStatusChange(q.id, status)}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer font-bold text-xs transition-all ${
                                q.status === status ? statusColors[status] : "text-gray-600 hover:bg-gray-50 focus:bg-gray-50"
                              }`}
                            >
                              <div className={`h-2 w-2 rounded-full ${status === 'pending' ? 'bg-gray-500' : status === 'negotiating' ? 'bg-blue-500' : status === 'approved' ? 'bg-green-500' : status === 'rejected' ? 'bg-red-500' : 'bg-amber-500'}`} />
                              {statusLabels[status]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-gray-400">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Calendar className="h-3 w-3" />
                        <span suppressHydrationWarning>{new Date(q.created_at).toLocaleDateString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Edit Button */}
                        <Link
                          href={`/?edit=${q.id}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-bold text-black shadow-sm transition-all hover:bg-gray-50 hover:border-black/20"
                          title="Edit Quotation"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>Edit</span>
                        </Link>

                        {/* Download PDF Button */}
                        <button
                          onClick={() => handleDownloadPDF(q)}
                          disabled={downloadingId === q.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-black px-2.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-black/90 disabled:opacity-50 cursor-pointer"
                          title="Download PDF"
                        >
                          <Download className="h-3 w-3" />
                          <span>{downloadingId === q.id ? 'PDF...' : 'PDF'}</span>
                        </button>

                        {/* View PDF Button (if stored URL exists) */}
                        {q.pdf_url && (
                          <a
                            href={q.pdf_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1.5 text-xs font-bold text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-black"
                            title="View PDF"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        )}

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeletingQuotation(q)}
                          className="inline-flex items-center gap-1 rounded-lg border border-transparent p-1.5 text-xs font-bold text-red-500 hover:bg-red-50 hover:border-red-200 transition-all cursor-pointer"
                          title="Delete Quotation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingQuotation} onOpenChange={(open) => !open && !isDeleting && setDeletingQuotation(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mb-3 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold text-gray-900">Delete Quotation</DialogTitle>
            <DialogDescription className="text-center text-sm text-gray-500 mt-2">
              Are you sure you want to delete quotation <span className="font-semibold text-gray-900">{deletingQuotation?.quotation_number}</span> for <span className="font-semibold text-gray-900">{deletingQuotation?.customer_name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 sm:space-x-2">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setDeletingQuotation(null)}
              className="w-full sm:w-auto inline-flex justify-center items-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Quotation</span>
                </>
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
