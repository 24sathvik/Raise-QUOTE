"use client"

import { useState, useEffect, useRef } from "react"
import { Search, Calendar, Download, Menu, X, Plus, Package, LogOut, FileText, ChevronDown } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { updateQuotationStatus } from "./actions"

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
  status: QuotationStatus
  pdf_url: string | null
}

interface UserProfile {
  full_name: string
  role: string
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

export default function QuotationsClient({ initialQuotations, user }: { initialQuotations: Quotation[], user: UserProfile }) {
  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const isMutating = useRef(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sortField, setSortField] = useState<'created_at' | 'grand_total' | 'status' | 'customer_name'>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])
  
  const router = useRouter()

  const filtered = initialQuotations.filter(
    (q) =>
      q.customer_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      q.quotation_number?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      q.customer_company?.toLowerCase().includes(debouncedSearch.toLowerCase())
  )

  const statusOrder = { approved: 0, negotiating: 1, pending: 2, on_hold: 3, rejected: 4 }

  const sorted = [...filtered].sort((a, b) => {
    let valA: any = (a as any)[sortField]
    let valB: any = (b as any)[sortField]

    if (sortField === 'status') {
      valA = statusOrder[a.status as keyof typeof statusOrder] ?? 99
      valB = statusOrder[b.status as keyof typeof statusOrder] ?? 99
      return sortDir === 'asc' ? valA - valB : valB - valA
    }

    if (typeof valA === 'string') return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
    return sortDir === 'asc' ? valA - valB : valB - valA
  })

  const handleStatusChange = async (id: string, newStatus: QuotationStatus) => {
    if (isMutating.current) return
    isMutating.current = true
    setUpdatingId(id)
    try {
      const result = await updateQuotationStatus(id, newStatus)
      if (result?.error) throw new Error(result.error)
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
    <div className="flex min-h-screen bg-[#FDFDFD]">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar matching QuotationBuilder Sales layout */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-100 bg-white transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                <span className="font-black">R</span>
              </div>
              <span className="text-sm font-black tracking-tighter">RAISE LABS</span>
            </div>
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-black transition-all"
            >
              <Plus className="h-5 w-5" />
              New Quotation
            </Link>
            
            <Link
              href="/quotations"
              className="flex items-center gap-3 rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all"
            >
              <FileText className="h-5 w-5" />
              My Quotations
            </Link>

            <div className="my-6 h-px bg-gray-50" />

            <Link
              href={user?.role === 'admin' ? "/admin/products" : "/catalog"}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-black transition-all"
            >
              <Package className="h-5 w-5" />
              Catalog
            </Link>
          </nav>

          <div className="border-t border-gray-50 p-4">
            <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-gray-50/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white uppercase">
                {user?.full_name?.[0] || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-bold text-black">{user?.full_name || 'User'}</p>
                <p className="truncate text-[10px] font-medium text-gray-400 uppercase tracking-wider">Professional</p>
              </div>
              {/* Force POST to signout securely using a form */}
              <form action="/auth/signout" method="POST">
                <button type="submit" className="text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 transition-all lg:pl-64">
        {/* Mobile Header */}
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 px-6 backdrop-blur-md lg:hidden">
          <button onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
              <span className="text-xs font-black">R</span>
            </div>
            <span className="text-xs font-black tracking-tighter">RAISE LABS</span>
          </div>
          <div className="w-6" />
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 lg:px-10 lg:py-10 space-y-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-black">My Quotations</h1>
            <p className="text-sm font-medium text-gray-400">You have {initialQuotations.length} quotations generated in total.</p>
          </div>
          
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search by customer, company, or number..."
                className="pl-9 h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold whitespace-nowrap text-gray-500">Sort by:</span>
              <Select value={`${sortField}-${sortDir}`} onValueChange={(val) => {
                const [f, d] = val.split('-') as [typeof sortField, 'asc' | 'desc']
                setSortField(f)
                setSortDir(d)
              }}>
                <SelectTrigger className="h-11 rounded-xl bg-white border-gray-100 font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="created_at-desc">Date (Newest)</SelectItem>
                  <SelectItem value="created_at-asc">Date (Oldest)</SelectItem>
                  <SelectItem value="grand_total-desc">Amount (Highest)</SelectItem>
                  <SelectItem value="grand_total-asc">Amount (Lowest)</SelectItem>
                  <SelectItem value="status-desc">Status (Approved first)</SelectItem>
                  <SelectItem value="customer_name-asc">Customer A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-3xl border-none bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/50">
                  <TableRow className="border-b-gray-100 hover:bg-transparent">
                    <TableHead className="px-6 py-4 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">#</TableHead>
                    <TableHead className="px-6 py-4 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">Quotation No</TableHead>
                    <TableHead className="px-6 py-4 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</TableHead>
                    <TableHead className="px-6 py-4 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">Company</TableHead>
                    <TableHead className="px-6 py-4 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</TableHead>
                    <TableHead className="px-6 py-4 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">Email</TableHead>
                    <TableHead className="px-6 py-4 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">Amount</TableHead>
                    <TableHead className="px-6 py-4 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">Status</TableHead>
                    <TableHead className="px-6 py-4 whitespace-nowrap text-[10px] font-black uppercase tracking-widest text-gray-400">Date</TableHead>
                    <TableHead className="px-6 py-4 whitespace-nowrap text-right text-[10px] font-black uppercase tracking-widest text-gray-400">PDF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-sm font-bold text-gray-400">
                        {search ? "No matches found." : "You haven't created any quotations yet."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    sorted.map((q, idx) => (
                      <TableRow key={q.id} className="hover:bg-gray-50/50 transition-colors border-gray-50">
                        <TableCell className="px-6 py-4 font-bold text-gray-400 text-xs">{idx + 1}</TableCell>
                        <TableCell className="px-6 py-4 font-mono text-xs font-bold text-black">{q.quotation_number}</TableCell>
                        <TableCell className="px-6 py-4"><div className="text-sm font-bold text-black">{q.customer_name}</div></TableCell>
                        <TableCell className="px-6 py-4"><div className="text-xs font-medium text-gray-500">{q.customer_company || "—"}</div></TableCell>
                        <TableCell className="px-6 py-4"><div className="text-xs font-medium text-gray-500">{q.customer_phone || "—"}</div></TableCell>
                        <TableCell className="px-6 py-4"><div className="text-xs font-medium text-gray-500">{q.customer_email || "—"}</div></TableCell>
                        <TableCell className="px-6 py-4 text-sm font-black text-black">₹{q.grand_total?.toLocaleString()}</TableCell>
                        <TableCell className="px-6 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                disabled={updatingId === q.id}
                                className={`flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-xl transition-all cursor-pointer font-bold text-xs ring-1 ring-offset-1 hover:ring-2 disabled:opacity-50 ${statusColors[q.status || 'pending']}`}
                              >
                                {statusLabels[q.status || 'pending']}
                                <ChevronDown className="h-4 w-4 opacity-50" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] rounded-xl p-2 shadow-xl border border-gray-100 bg-white">
                              {(Object.keys(statusLabels) as QuotationStatus[]).map((status) => (
                                <DropdownMenuItem
                                  key={status}
                                  onClick={() => handleStatusChange(q.id, status)}
                                  className={`flex items-center gap-2 min-h-[44px] rounded-lg px-4 py-3 mb-1 cursor-pointer font-bold text-xs transition-all last:mb-0 ${
                                    q.status === status ? statusColors[status] : "text-gray-600 hover:bg-gray-50 focus:bg-gray-50"
                                  }`}
                                >
                                  <div className={`h-2 w-2 rounded-full ${statusColors[status].split(" ")[0].replace("bg-", "bg-").replace("-100", "-500")}`} />
                                  {statusLabels[status]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span suppressHydrationWarning className="text-xs font-bold">{new Date(q.created_at).toLocaleDateString()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          {q.pdf_url && (
                            <a href={q.pdf_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-black shadow-sm transition-all hover:bg-gray-50 hover:shadow-md">
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
      </main>
    </div>
  )
}
