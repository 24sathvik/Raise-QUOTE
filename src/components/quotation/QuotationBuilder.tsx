"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import {
  Plus,
  Trash2,
  Download,
  Trash,
  Search,
  User,
  Hash,
  FileText,
  Settings as SettingsIcon,
  LogOut,
  ChevronRight,
  Package,
  CheckCircle2,
  PlusCircle,
  Menu,
  X,
  ChevronDown,
  ArrowLeft,
  Pencil
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Badge
} from "@/components/ui/badge"
import { generateQuotationPDF } from "@/lib/pdf-service"
import {
  getNextQuotationNumber,
  saveQuotation,
  updateQuotation,
  updateQuotationPdfUrl,
} from "@/app/quotations/actions"

// 🔥 MARGIN CONFIGURATION
const MARGIN_PERCENTAGE = 50 // Sales sees 30% markup over base price

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  sku: string
  addons?: { name: string; price: number; active?: boolean; moc?: string; qty?: string }[]
  line_items?: { description: string; price: number }[]
  specs?: { key: string; value: string }[]
  features?: string[]
  category?: string
  image_format?: 'wide' | 'tall'
}

interface QuotationItem {
  id: string
  product_id: string
  name: string
  description: string
  qty: number
  base_price: number
  mrp: number
  price: number
  image_url: string | null
  sku: string
  selectedAddons?: { name: string; price: number; moc?: string; qty?: string }[]
  specs?: { key: string; value: string }[]
  features?: string[]
  image_format?: 'wide' | 'tall'
  availableLineItems?: { description: string; price: number }[]
  selectedLineItems?: { description: string; price: number }[]
}

interface Term {
  id: string
  text: string
  selected: boolean
}

interface QuotationBuilderProps {
  initialProducts: Product[]
  settings: any
  user: any
  editingQuotation?: any | null
}

type Currency = 'INR' | 'USD'

const DEFAULT_TERMS = [
  "Taxes: 18% GST extra applicable",
  "Packaging & Forwarding: Extra As Applicable",
  "Freight: To Pay / Extra as applicable",
  "DELIVERY: We deliver the order in 3-4 Weeks from the date of receipt of purchase order",
  "INSTALLATION: Fees extra as applicable",
  "PAYMENT: 100% payment at the time of proforma invoice prior to dispatch.",
  "WARRANTY: One year warranty from the date of dispatch",
  "WARRANTY: Two years warranty from the date of dispatch",
  "WARRANTY: Three years warranty from the date of dispatch",
  "GOVERNING LAW: These Terms and Conditions and any action related hereto shall be governed, controlled, interpreted and defined by and under the laws of the State of Telangana",
  "MODIFICATION: Any modification of these Terms and Conditions shall be valid only if it is in writing and signed by the authorized representatives of both Supplier and Customer."
]

const WARRANTY_TERMS = [
  "WARRANTY: One year warranty from the date of dispatch",
  "WARRANTY: Two years warranty from the date of dispatch",
  "WARRANTY: Three years warranty from the date of dispatch",
]

export default function QuotationBuilder({ initialProducts, settings, user, editingQuotation }: QuotationBuilderProps) {
  const isEditMode = !!editingQuotation

  // Initial enriched items if editing an existing quotation
  const initialEnrichedItems = useMemo(() => {
    if (!editingQuotation?.items_json) return []
    try {
      const raw = typeof editingQuotation.items_json === 'string'
        ? JSON.parse(editingQuotation.items_json)
        : editingQuotation.items_json
      const itemsList = Array.isArray(raw) ? raw : (raw?.items || [])
      return itemsList.map((item: QuotationItem) => {
        const source = initialProducts.find((p: Product) => p.id === item.product_id)
        return {
          ...item,
          availableLineItems: item.availableLineItems ?? (source?.line_items ? [...source.line_items] : []),
          selectedLineItems: item.selectedLineItems ?? (source?.line_items ? [...source.line_items] : []),
        }
      })
    } catch {
      return []
    }
  }, [editingQuotation, initialProducts])

  const [items, setItems] = useState<QuotationItem[]>(initialEnrichedItems)
  const [customer, setCustomer] = useState({
    name: editingQuotation?.customer_name || "",
    company: editingQuotation?.customer_company || "",
    phone: editingQuotation?.customer_phone || "",
    email: editingQuotation?.customer_email || "",
    address: editingQuotation?.customer_address || "",
  })
  const [meta, setMeta] = useState({
    number: editingQuotation?.quotation_number || "RLE-...",
    date: (editingQuotation?.created_at || '').split("T")[0] || new Date().toISOString().split("T")[0],
    validity_days: 30,
  })
  const [discount, setDiscount] = useState<number>(editingQuotation?.discount_total || 0)
  const [isProductOpen, setIsProductOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [terms, setTerms] = useState<Term[]>(
    DEFAULT_TERMS.map((t, i) => ({
      id: `term-${i}`,
      text: t,
      selected: WARRANTY_TERMS.includes(t)
        ? t === "WARRANTY: One year warranty from the date of dispatch"
        : true
    }))
  )
  const [currency, setCurrency] = useState<Currency>('INR')
  const [note, setNote] = useState("")

  // Sync state whenever editingQuotation changes
  useEffect(() => {
    if (editingQuotation) {
      setItems(initialEnrichedItems)
      setCustomer({
        name: editingQuotation.customer_name || "",
        company: editingQuotation.customer_company || "",
        phone: editingQuotation.customer_phone || "",
        email: editingQuotation.customer_email || "",
        address: editingQuotation.customer_address || "",
      })
      setMeta({
        number: editingQuotation.quotation_number || "RLE-...",
        date: (editingQuotation.created_at || '').split("T")[0] || new Date().toISOString().split("T")[0],
        validity_days: 30,
      })
      setDiscount(editingQuotation.discount_total || 0)
    }
  }, [editingQuotation, initialEnrichedItems])

  // Fetch next sequential quotation number via server action ONLY when creating a new quote
  useEffect(() => {
    if (!isEditMode) {
      getNextQuotationNumber().then(({ number }) => {
        setMeta(prev => ({ ...prev, number }))
      })
    }
  }, [isEditMode])

  // Load draft ONLY when not in edit mode
  useEffect(() => {
    if (isEditMode) return
    const DRAFT_VERSION = 'v3'
    const draft = localStorage.getItem("quotation_draft")
    if (draft) {
      try {
        const parsed = JSON.parse(draft)
        if (parsed._v !== DRAFT_VERSION || !parsed.items?.length) {
          localStorage.removeItem("quotation_draft")
          return
        }
        const enrichedItems = (parsed.items || []).map((item: QuotationItem) => {
          const source = initialProducts.find((p: Product) => p.id === item.product_id)
          return {
            ...item,
            availableLineItems: item.availableLineItems ?? (source?.line_items ? [...source.line_items] : []),
            selectedLineItems: item.selectedLineItems ?? (source?.line_items ? [...source.line_items] : []),
          }
        })
        setItems(enrichedItems)
        setCustomer(parsed.customer || { name: "", company: "", phone: "", email: "", address: "" })
        if (parsed.meta?.date) {
          setMeta(prev => ({ ...prev, date: parsed.meta.date, validity_days: parsed.meta.validity_days || 30 }))
        }
        setDiscount(parsed.discount || 0)
        if (parsed.currency) {
          setCurrency(parsed.currency)
        }
        if (parsed.terms) {
          setTerms(parsed.terms)
        }
        if (parsed.note) {
          setNote(parsed.note)
        }
      } catch (e) {
        localStorage.removeItem("quotation_draft")
      }
    }
  }, [isEditMode, initialProducts])

  // Save draft with debounce ONLY when not in edit mode
  useEffect(() => {
    if (isEditMode) return
    const timeoutId = setTimeout(() => {
      localStorage.setItem(
        "quotation_draft",
        JSON.stringify({ _v: 'v3', items, customer, meta, discount, terms, note, currency })
      )
    }, 1000)
    return () => clearTimeout(timeoutId)
  }, [isEditMode, items, customer, meta, discount, terms, note, currency])

  const totals = useMemo(() => {
    const subtotalRaw = items.reduce((acc, item) => {
      const addonsPrice = item.selectedAddons?.reduce((sum, addon) => sum + (addon.price || 0), 0) || 0
      const lineItemsPrice = item.selectedLineItems?.reduce((sum, li) => sum + (li.price || 0), 0) || 0
      return acc + ((item.price || 0) + addonsPrice + lineItemsPrice) * (item.qty || 1)
    }, 0)
    const subtotal = currency === 'USD' ? Number(subtotalRaw.toFixed(2)) : Math.round(subtotalRaw)
    const tax_amount = 0
    const grandTotalRaw = Math.max(0, subtotal - discount)
    const grand_total = currency === 'USD' ? Number(grandTotalRaw.toFixed(2)) : Math.round(grandTotalRaw)
    return { subtotal, tax_amount, grand_total }
  }, [items, discount, currency])

  const addItem = useCallback((product: Product) => {
    const isUSD = currency === 'USD'
    const conversionRate = 83
    const rawBasePrice = product.price || 0
    const basePrice = isUSD ? Number((rawBasePrice / conversionRate).toFixed(2)) : rawBasePrice
    const mrp = isUSD
      ? Number((basePrice * (1 + MARGIN_PERCENTAGE / 100)).toFixed(2))
      : Math.round(basePrice * (1 + MARGIN_PERCENTAGE / 100))

    const processAddons = (addons: any[]) => (addons || []).map(a => ({
      name: a.name,
      price: isUSD ? Number(((a.price || 0) / conversionRate).toFixed(2)) : (a.price || 0),
      moc: a.moc,
      qty: a.qty
    }))

    const processLineItems = (lineItems: any[]) => (lineItems || []).map(li => ({
      description: li.description,
      price: isUSD ? Number(((li.price || 0) / conversionRate).toFixed(2)) : (li.price || 0)
    }))

    const newItem: QuotationItem = {
      id: Math.random().toString(36).slice(2),
      product_id: product.id,
      name: product.name,
      description: product.description,
      qty: 1,
      base_price: basePrice,
      mrp: mrp,
      price: mrp,
      image_url: product.image_url,
      sku: product.sku,
      selectedAddons: product.addons ? processAddons(product.addons) : [],
      availableLineItems: product.line_items ? processLineItems(product.line_items) : [],
      selectedLineItems: product.line_items ? processLineItems(product.line_items) : [],
      specs: product.specs || [],
      features: product.features || [],
      image_format: product.image_format || 'wide'
    }
    setItems(prev => [...prev, newItem])
    setIsProductOpen(false)
    toast.success(`${product.name} added at MRP ${isUSD ? '$' : '₹'}${mrp.toLocaleString(undefined, { minimumFractionDigits: isUSD ? 2 : 0, maximumFractionDigits: 2 })}`)
  }, [currency])

  const updateItem = useCallback((id: string, updates: Partial<QuotationItem>) => {
    setItems(items => items.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    ))
  }, [])

  const removeItem = useCallback((id: string) => {
    setItems(items => items.filter((item) => item.id !== id))
  }, [])

  const toggleAddon = useCallback((itemId: string, addon: { name: string; price: number; moc?: string; qty?: string }) => {
    const isUSD = currency === 'USD'
    const conversionRate = 83
    const effectivePrice = isUSD ? Number(((addon.price || 0) / conversionRate).toFixed(2)) : (addon.price || 0)
    const addonToAdd = { ...addon, price: effectivePrice }

    setItems(items => items.map(item => {
      if (item.id === itemId) {
        const currentAddons = item.selectedAddons || []
        const exists = currentAddons.find(a => a.name === addon.name)
        const nextAddons = exists
          ? currentAddons.filter(a => a.name !== addon.name)
          : [...currentAddons, addonToAdd]
        return { ...item, selectedAddons: nextAddons }
      }
      return item
    }))
  }, [currency])

  const toggleLineItem = useCallback((itemId: string, li: { description: string; price: number }) => {
    const isUSD = currency === 'USD'
    const conversionRate = 83
    const effectivePrice = isUSD ? Number(((li.price || 0) / conversionRate).toFixed(2)) : (li.price || 0)
    const lineItemToAdd = { ...li, price: effectivePrice }

    setItems(items => items.map(item => {
      if (item.id === itemId) {
        const current = item.selectedLineItems || []
        const exists = current.find(l => l.description === li.description)
        const next = exists
          ? current.filter(l => l.description !== li.description)
          : [...current, lineItemToAdd]
        return { ...item, selectedLineItems: next }
      }
      return item
    }))
  }, [currency])

  const toggleTerm = useCallback((termId: string) => {
    setTerms(terms => {
      const clickedTerm = terms.find(t => t.id === termId)
      const isWarrantyTerm = WARRANTY_TERMS.includes(clickedTerm?.text || "")
      if (isWarrantyTerm) {
        return terms.map(t => {
          if (WARRANTY_TERMS.includes(t.text)) {
            return { ...t, selected: t.id === termId }
          }
          return t
        })
      } else {
        return terms.map(t => t.id === termId ? { ...t, selected: !t.selected } : t)
      }
    })
  }, [])

  const clearQuotation = () => {
    if (isEditMode) {
      if (!confirm("Discard changes and return to create new quotation?")) return
      window.location.href = "/"
      return
    }
    if (!confirm("Are you sure you want to clear this quotation?")) return
    setItems([])
    setCustomer({ name: "", company: "", phone: "", email: "", address: "" })
    getNextQuotationNumber().then(({ number }) => {
      setMeta({
        number,
        date: new Date().toISOString().split("T")[0],
        validity_days: 30,
      })
    })
    setDiscount(0)
    setTerms(DEFAULT_TERMS.map((t, i) => ({
      id: `term-${i}`,
      text: t,
      selected: WARRANTY_TERMS.includes(t)
        ? t === "WARRANTY: One year warranty from the date of dispatch"
        : true
    })))
    setNote("")
    localStorage.removeItem("quotation_draft")
  }

  const handleDownload = async () => {
    if (!customer.name) {
      toast.error("Please enter customer name")
      return
    }
    if (items.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    setSaving(true)
    try {
      if (!user || !user.id) {
        toast.error("User session not found. Please log in again.")
        window.location.href = "/auth/login"
        return
      }

      const calculatedValidityDate = new Date(
        new Date(meta.date).setDate(new Date(meta.date).getDate() + (meta.validity_days || 30))
      ).toISOString()

      let quotationData: any = null
      let revNumber = 0

      if (isEditMode) {
        revNumber = (editingQuotation.revision_number || 0) + 1
        const targetNumber = meta.number || editingQuotation.quotation_number
        const result = await updateQuotation(editingQuotation.id, {
          quotation_number: targetNumber,
          customer_name: customer.name,
          customer_company: customer.company,
          customer_phone: customer.phone,
          customer_email: customer.email,
          customer_address: customer.address,
          items_json: items,
          subtotal: totals.subtotal,
          tax_amount: 0,
          total_amount: totals.grand_total,
          discount_total: discount,
          grand_total: totals.grand_total,
          revision_number: revNumber
        })

        if (result.error) throw new Error(result.error)
        quotationData = { ...result.data!, quotation_number: targetNumber, revision_number: revNumber }
      } else {
        const result = await saveQuotation({
          quotation_number: meta.number,
          created_by: user.id,
          customer_name: customer.name,
          customer_company: customer.company,
          customer_phone: customer.phone,
          customer_email: customer.email,
          customer_address: customer.address,
          items_json: items,
          subtotal: totals.subtotal,
          tax_amount: 0,
          total_amount: totals.grand_total,
          discount_total: discount,
          grand_total: totals.grand_total,
          status: 'pending',
          revision_number: 0
        })

        if (result.error) throw new Error(result.error)
        quotationData = { ...result.data!, revision_number: 0 }
      }

      // 2. Generate PDF blob (and doc.save downloads the file with revision name)
      const pdfBlob = await generateQuotationPDF({
        quotation: quotationData,
        items: items,
        settings,
        user,
        selectedTerms: terms.filter(t => t.selected).map(t => ({
          title: t.text.split(':')[0],
          text: t.text.split(':').slice(1).join(':').trim()
        })),
        currency,
        validityData: {
          issueDate: meta.date,
          validityDate: calculatedValidityDate,
          validityDays: meta.validity_days
        },
        note
      })

      // 3. Upload PDF via the shared /api/upload route
      const storageFileName = `${quotationData.quotation_number}_rev${revNumber}_${quotationData.id}.pdf`
      const pdfFile = new File([pdfBlob], storageFileName, { type: 'application/pdf' })
      const fd = new FormData()
      fd.append('file', pdfFile)
      fd.append('bucket', 'quotations')

      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd })
      const uploadJson = await uploadRes.json()

      if (uploadRes.ok && uploadJson.url) {
        // 4. Persist PDF URL via server action
        await updateQuotationPdfUrl(quotationData.id, uploadJson.url)
      } else {
        console.error("PDF Upload Error:", uploadJson.error)
      }

      if (isEditMode) {
        toast.success(`Quotation ${quotationData.quotation_number} updated to Revision #${revNumber}`)
        localStorage.removeItem("quotation_draft")
        setTimeout(() => {
          window.location.href = user?.role === 'admin' ? '/admin/quotations' : '/quotations'
        }, 1200)
      } else {
        toast.success(`Quotation ${quotationData.quotation_number} saved & downloaded!`)
        // Clean up the form completely for a fresh new quotation
        localStorage.removeItem("quotation_draft")
        setItems([])
        setCustomer({ name: "", company: "", phone: "", email: "", address: "" })
        setDiscount(0)
        setNote("")
        setTerms(DEFAULT_TERMS.map((t, i) => ({
          id: `term-${i}`,
          text: t,
          selected: WARRANTY_TERMS.includes(t)
            ? t === "WARRANTY: One year warranty from the date of dispatch"
            : true
        })))
        try {
          const next = await getNextQuotationNumber()
          setMeta({
            number: next.number,
            date: new Date().toISOString().split("T")[0],
            validity_days: 30,
          })
        } catch {
          // Fallback increment
          setMeta(prev => {
            const match = prev.number.match(/RLE-(\d+)/)
            if (match) return { ...prev, number: `RLE-${parseInt(match[1]) + 1}`, date: new Date().toISOString().split("T")[0], validity_days: 30 }
            return prev
          })
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setSaving(false)
        toast.info("Connection interrupted, retrying...")
        setTimeout(() => handleDownload(), 800)
        return
      }
      toast.error(err.message || 'An unexpected error occurred')
    } finally {
      setSaving(false)
    }
  }

  // ─── Derived term lists for rendering ────────────────────────────────────────
  const nonWarrantyTerms = useMemo(() => terms.filter(t => !WARRANTY_TERMS.includes(t.text)), [terms])
  const warrantyTerms = useMemo(() => terms.filter(t => WARRANTY_TERMS.includes(t.text)), [terms])
  const selectedWarrantyLabel = useMemo(() => {
    const selected = warrantyTerms.find(t => t.selected)
    return selected ? selected.text.split(':').slice(1).join(':').trim() : "None selected"
  }, [warrantyTerms])

  return (
    <div className="flex min-h-screen bg-[#FDFDFD]">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-100 bg-white transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="flex h-20 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-black">
                <img src="/Zyxen-logo.jpeg" alt="Zyxen Logo" className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="truncate text-sm font-black tracking-tighter leading-none">Raise Labs</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user?.role === 'admin' ? (isEditMode ? 'Admin Editor' : 'Admin Panel') : 'Sales Panel'}
                </span>
              </div>
            </div>
            <button className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-6">
            {user?.role === 'admin' && (
              <Link
                href="/admin/quotations"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-all mb-2 border border-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Quotation Management
              </Link>
            )}

            <Link
              href="/"
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                !isEditMode ? 'bg-black text-white shadow-lg' : 'text-gray-500 hover:bg-gray-50 hover:text-black'
              }`}
            >
              <Plus className="h-5 w-5" />
              New Quotation
            </Link>

            <Link
              href="/quotations"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-black transition-all"
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

            {user?.role === 'admin' && (
              <Link
                href="/admin/users"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-black transition-all"
              >
                <User className="h-5 w-5" />
                Team
              </Link>
            )}
          </nav>

          <div className="border-t border-gray-50 p-4">
            <div className="flex items-center gap-3 px-2 py-3 rounded-xl bg-gray-50/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white uppercase">
                {user?.full_name?.[0] || 'A'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-xs font-bold text-black">{user?.full_name || 'Admin'}</p>
                <p className="truncate text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  {user?.role === 'admin' ? 'Administrator' : 'Sales Representative'}
                </p>
              </div>
              <form action="/auth/signout" method="POST">
                <button type="submit" className="text-gray-400 hover:text-red-500 transition-colors">
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 transition-all lg:pl-64">
        {/* Mobile Header */}
        <div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 px-6 backdrop-blur-md lg:hidden">
          <button onClick={() => setIsSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-black">
              <img src="/Zyxen-logo.jpeg" alt="Zyxen Logo" className="h-full w-full object-cover" />
            </div>
            <span className="text-xs font-black tracking-tighter">RAISE LABS</span>
          </div>
          <div className="w-6" />
        </div>

        <div className="mx-auto max-w-5xl px-4 py-8 lg:px-10 lg:py-10">
          <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-black tracking-tight text-black">
                {isEditMode ? (
                  <>
                    Edit <span className="text-gray-400">Quotation</span>
                  </>
                ) : (
                  <>
                    Quotation <span className="text-gray-300">Generator</span>
                  </>
                )}
              </h1>
              <p className="text-sm font-medium text-gray-400">
                {isEditMode
                  ? `Modifying quotation ${editingQuotation.quotation_number} - Base quote number will be preserved`
                  : "Generate professional pharmaceutical product quotes"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={clearQuotation} className="h-11 rounded-xl px-5 font-bold border-gray-200 hover:bg-red-50 hover:text-red-600 transition-all">
                Reset
              </Button>
            </div>
          </header>

          {isEditMode && (
            <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-black text-white flex items-center justify-center font-black text-xs uppercase tracking-wider">
                  Rev {(editingQuotation.revision_number || 0) + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-black">Editing Quotation: {editingQuotation.quotation_number}</h3>
                    <Badge variant="outline" className="bg-amber-100/80 text-amber-800 border-amber-300 font-bold text-[10px]">
                      Revision #{(editingQuotation.revision_number || 0) + 1}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Quotation number stays strictly <strong className="text-black">{editingQuotation.quotation_number}</strong>. PDF and records will save as Revision #{(editingQuotation.revision_number || 0) + 1}.
                  </p>
                </div>
              </div>
              <Link
                href={user?.role === 'admin' ? "/admin/quotations" : "/quotations"}
                className="inline-flex shrink-0 items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm transition-all active:scale-95"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Quotations
              </Link>
            </div>
          )}

          <div className="grid gap-8">
            {/* Customer & Meta */}
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-400">Client Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Client Name</Label>
                      <Input
                        className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                        value={customer.name}
                        onChange={(e: any) => setCustomer({ ...customer, name: e.target.value })}
                        placeholder="e.g. Acme Corp"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Company Name</Label>
                      <Input
                        className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                        value={customer.company}
                        onChange={(e: any) => setCustomer({ ...customer, company: e.target.value })}
                        placeholder="e.g. Acme Pharmaceuticals Ltd."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-gray-700">Phone</Label>
                      <Input
                        className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                        value={customer.phone}
                        onChange={(e: any) => setCustomer({ ...customer, phone: e.target.value })}
                        placeholder="+91..."
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Email Address</Label>
                    <Input
                      className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                      value={customer.email}
                      onChange={(e: any) => setCustomer({ ...customer, email: e.target.value })}
                      placeholder="client@company.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Shipping Address</Label>
                    <Input
                      className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                      value={customer.address}
                      onChange={(e: any) => setCustomer({ ...customer, address: e.target.value })}
                      placeholder="Full address details"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-400">Quotation Meta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Quotation ID</Label>
                    <Input
                      className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-mono"
                      value={meta.number}
                      onChange={(e: any) => setMeta({ ...meta, number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Issue Date</Label>
                    <Input
                      type="date"
                      className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                      value={meta.date}
                      onChange={(e: any) => setMeta({ ...meta, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Validity (Days)</Label>
                    <Input
                      type="number"
                      className="h-11 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all"
                      value={meta.validity_days}
                      onChange={(e: any) => {
                        const value = e.target.value
                        setMeta({
                          ...meta,
                          validity_days: value === "" ? 0 : parseInt(value) || 0
                        })
                      }}
                      onBlur={() => {
                        if (meta.validity_days < 1) {
                          setMeta({ ...meta, validity_days: 30 })
                        }
                      }}
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Currency</Label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (currency !== 'INR') {
                            const conversionRate = 83
                            setItems(items.map(item => ({
                              ...item,
                              base_price: Math.round(item.base_price * conversionRate),
                              mrp: Math.round(item.mrp * conversionRate),
                              price: Math.round(item.price * conversionRate),
                              selectedAddons: item.selectedAddons?.map(addon => ({
                                ...addon,
                                price: Math.round(addon.price * conversionRate)
                              })),
                              availableLineItems: item.availableLineItems?.map(li => ({
                                ...li,
                                price: Math.round(li.price * conversionRate)
                              })),
                              selectedLineItems: item.selectedLineItems?.map(li => ({
                                ...li,
                                price: Math.round(li.price * conversionRate)
                              }))
                            })))
                            setDiscount(prev => Math.round(prev * conversionRate))
                            setCurrency('INR')
                          }
                        }}
                        className={`flex-1 h-11 rounded-xl font-bold transition-all ${currency === 'INR'
                          ? 'bg-black text-white'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                      >
                        INR
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (currency !== 'USD') {
                            const conversionRate = 83
                            setItems(items.map(item => ({
                              ...item,
                              base_price: Number((item.base_price / conversionRate).toFixed(2)),
                              mrp: Number((item.mrp / conversionRate).toFixed(2)),
                              price: Number((item.price / conversionRate).toFixed(2)),
                              selectedAddons: item.selectedAddons?.map(addon => ({
                                ...addon,
                                price: Number((addon.price / conversionRate).toFixed(2))
                              })),
                              availableLineItems: item.availableLineItems?.map(li => ({
                                ...li,
                                price: Number((li.price / conversionRate).toFixed(2))
                              })),
                              selectedLineItems: item.selectedLineItems?.map(li => ({
                                ...li,
                                price: Number((li.price / conversionRate).toFixed(2))
                              }))
                            })))
                            setDiscount(prev => Number((prev / conversionRate).toFixed(2)))
                            setCurrency('USD')
                          }
                        }}
                        className={`flex-1 h-11 rounded-xl font-bold transition-all ${currency === 'USD'
                          ? 'bg-black text-white'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                      >
                        USD
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Line Items */}
            <Card className="border-none bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-col gap-4 border-b border-gray-50 p-6 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-400">Line Items</CardTitle>
                <Popover open={isProductOpen} onOpenChange={setIsProductOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 w-full rounded-xl gap-2 border-gray-200 font-bold hover:bg-black hover:text-white transition-all sm:w-auto">
                      <Plus className="h-4 w-4" /> Add Product
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-32px)] max-w-[400px] p-0 rounded-2xl shadow-2xl border-none" align="end">
                    <Command className="rounded-2xl">
                      <CommandInput placeholder="Search products..." className="h-12 border-none focus:ring-0" />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup className="p-2">
                          {initialProducts.map((product) => {
                            const isUSD = currency === 'USD'
                            const convertedPrice = isUSD ? (product.price / 83) : product.price
                            const displayedMrp = isUSD
                              ? Number((convertedPrice * (1 + MARGIN_PERCENTAGE / 100)).toFixed(2))
                              : Math.round(convertedPrice * (1 + MARGIN_PERCENTAGE / 100))
                            return (
                              <CommandItem
                                key={product.id}
                                onSelect={() => addItem(product)}
                                className="flex items-center gap-3 rounded-xl p-3 cursor-pointer aria-selected:bg-gray-50 transition-all"
                              >
                                <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-gray-100 bg-white">
                                  {product.image_url && <Image src={product.image_url} alt={product.name} fill className="object-contain p-1" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-bold text-black">{product.name}</span>
                                  <span className="text-[10px] font-bold text-green-600 uppercase">
                                    MRP: {isUSD ? '$' : '₹'}{displayedMrp.toLocaleString(undefined, { minimumFractionDigits: isUSD ? 2 : 0, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </CommandItem>
                            )
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  {/* Desktop Table View */}
                  <Table className="hidden md:table">
                    <TableHeader>
                      <TableRow className="border-gray-50 hover:bg-transparent">
                        <TableHead className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Item Details</TableHead>
                        <TableHead className="w-[120px] text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">Qty</TableHead>
                        <TableHead className="w-[180px] text-[10px] font-bold uppercase tracking-widest text-gray-400">Selling Price</TableHead>
                        <TableHead className="w-[150px] text-right text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Amount</TableHead>
                        <TableHead className="w-[80px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="h-48 text-center text-sm font-medium text-gray-400">
                            Add products to build your quotation
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => {
                          const sourceProduct = initialProducts.find(p => p.id === item.product_id)
                          const isUSD = currency === 'USD'
                          return (
                            <TableRow key={item.id} className="border-gray-50 group hover:bg-gray-50/30 transition-colors">
                              <TableCell className="px-8 py-6">
                                <div className="flex items-start gap-4">
                                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                                    {item.image_url && <Image src={item.image_url} alt={item.name} fill className="object-contain p-2" />}
                                  </div>
                                  <div className="space-y-4 flex-1">
                                    <div className="space-y-1">
                                      <p className="text-sm font-black text-black uppercase tracking-tight">{item.name}</p>
                                      <p className="text-xs text-gray-400">
                                        {item.description?.length > 120
                                          ? item.description.substring(0, 120) + "..."
                                          : item.description}
                                      </p>
                                    </div>

                                    {/* Addons */}
                                    {sourceProduct?.addons && sourceProduct.addons.length > 0 && (
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Available Addons</p>
                                        <div className="flex flex-col gap-2">
                                          {sourceProduct.addons.map((addon) => {
                                            const addonDisplayPrice = isUSD ? Number(((addon.price || 0) / 83).toFixed(2)) : addon.price
                                            return (
                                              <div
                                                key={addon.name}
                                                className="flex items-center space-x-2 bg-gray-50/50 px-3 py-1.5 rounded-lg border border-gray-100 hover:border-black/10 transition-colors cursor-pointer"
                                                onClick={() => toggleAddon(item.id, addon)}
                                              >
                                                <Checkbox
                                                  id={`addon-${item.id}-${addon.name}`}
                                                  checked={!!item.selectedAddons?.find(a => a.name === addon.name)}
                                                  onCheckedChange={() => toggleAddon(item.id, addon)}
                                                  className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                                                />
                                                <label
                                                  htmlFor={`addon-${item.id}-${addon.name}`}
                                                  className="text-[10px] font-bold text-gray-600 cursor-pointer"
                                                >
                                                  {addon.name} (+{isUSD ? '$' : '₹'}{addonDisplayPrice.toLocaleString(undefined, { minimumFractionDigits: isUSD ? 2 : 0, maximumFractionDigits: 2 })})
                                                </label>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Extra Line Items */}
                                    {sourceProduct?.line_items && sourceProduct.line_items.length > 0 && (
                                      <div className="space-y-2">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Extra Line Items</p>
                                        <div className="flex flex-col gap-2">
                                          {sourceProduct.line_items.map((li, idx) => {
                                            const liDisplayPrice = isUSD ? Number(((li.price || 0) / 83).toFixed(2)) : li.price
                                            return (
                                              <div
                                                key={idx}
                                                className="flex items-center space-x-2 bg-gray-50/50 px-3 py-1.5 rounded-lg border border-gray-100 hover:border-black/10 transition-colors cursor-pointer"
                                                onClick={() => toggleLineItem(item.id, li)}
                                              >
                                                <Checkbox
                                                  id={`lineitem-${item.id}-${idx}`}
                                                  checked={!!item.selectedLineItems?.find(l => l.description === li.description)}
                                                  onCheckedChange={() => toggleLineItem(item.id, li)}
                                                  className="data-[state=checked]:bg-black data-[state=checked]:border-black"
                                                />
                                                <label
                                                  htmlFor={`lineitem-${item.id}-${idx}`}
                                                  className="flex-1 flex items-center justify-between text-[10px] font-bold text-gray-600 cursor-pointer"
                                                >
                                                  <span>{li.description}</span>
                                                  <span className="ml-4 shrink-0">
                                                    {liDisplayPrice > 0
                                                      ? `+${isUSD ? '$' : '₹'}${liDisplayPrice.toLocaleString(undefined, { minimumFractionDigits: isUSD ? 2 : 0, maximumFractionDigits: 2 })}`
                                                      : 'Included'}
                                                  </span>
                                                </label>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  className="mx-auto h-10 w-20 rounded-xl border-gray-100 bg-gray-50/50 text-center font-bold focus:bg-white"
                                  value={item.qty}
                                  onChange={(e: any) => {
                                    const value = e.target.value
                                    updateItem(item.id, { qty: value === "" ? 0 : parseInt(value) || 0 })
                                  }}
                                  onBlur={() => {
                                    if (item.qty < 1) updateItem(item.id, { qty: 1 })
                                  }}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1.5">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                                      {currency === 'INR' ? '₹' : '$'}
                                    </span>
                                    <Input
                                      type="number"
                                      step={currency === 'USD' ? "0.01" : "1"}
                                      className="h-10 w-full rounded-xl bg-gray-50/50 pl-6 pr-2 font-bold focus:bg-white transition-all border-gray-100"
                                      value={item.price}
                                      onChange={(e: any) => {
                                        const value = e.target.value
                                        updateItem(item.id, { price: value === "" ? 0 : Number(value) })
                                      }}
                                    />
                                  </div>
                                  <div className="text-right text-[9px] font-bold">
                                    <span className="text-green-600">
                                      Suggested: {currency === 'INR' ? '₹' : '$'}{item.mrp.toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm font-black text-black">
                                {currency === 'INR' ? '₹' : '$'}{((item.price + (item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0) + (item.selectedLineItems?.reduce((s, l) => s + (l.price || 0), 0) || 0)) * item.qty).toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="px-8">
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>

                  {/* Mobile Card View */}
                  <div className="flex flex-col gap-4 p-4 md:hidden">
                    {items.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-center text-sm font-medium text-gray-400 bg-gray-50/50 rounded-xl">
                        Add products to build your quotation
                      </div>
                    ) : (
                      items.map((item) => {
                        const sourceProduct = initialProducts.find(p => p.id === item.product_id)
                        const isUSD = currency === 'USD'
                        return (
                          <div key={item.id} className="relative flex flex-col gap-4 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                            <div className="flex items-start gap-4">
                              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-white">
                                {item.image_url && <Image src={item.image_url} alt={item.name} fill className="object-contain p-2" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="pr-8">
                                  <p className="text-sm font-black text-black uppercase tracking-tight truncate">{item.name}</p>
                                  <p className="text-xs text-gray-400 line-clamp-2 mt-1">{item.description}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-gray-400">Qty</Label>
                                <Input
                                  type="number"
                                  className="h-10 w-full rounded-xl border-gray-100 bg-gray-50/50 text-center font-bold focus:bg-white"
                                  value={item.qty}
                                  onChange={(e: any) => {
                                    const value = e.target.value
                                    updateItem(item.id, { qty: value === "" ? 0 : parseInt(value) || 0 })
                                  }}
                                  onBlur={() => {
                                    if (item.qty < 1) updateItem(item.id, { qty: 1 })
                                  }}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold uppercase text-gray-400">Selling Price</Label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                                    {currency === 'INR' ? '₹' : '$'}
                                  </span>
                                  <Input
                                    type="number"
                                    step={currency === 'USD' ? "0.01" : "1"}
                                    className="h-10 w-full rounded-xl bg-gray-50/50 pl-6 pr-2 font-bold focus:bg-white transition-all border-gray-100"
                                    value={item.price}
                                    onChange={(e: any) => {
                                      const value = e.target.value
                                      updateItem(item.id, { price: value === "" ? 0 : Number(value) })
                                    }}
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-end text-[9px] font-bold pt-2 border-t border-gray-50">
                              <span className="text-green-600">
                                Suggested MRP: {currency === 'INR' ? '₹' : '$'}{item.mrp.toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}
                              </span>
                            </div>

                            {/* Addons — mobile */}
                            {sourceProduct?.addons && sourceProduct.addons.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-gray-50">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Addons</p>
                                <div className="flex flex-col gap-2">
                                  {sourceProduct.addons.map((addon) => {
                                    const addonDisplayPrice = isUSD ? Number(((addon.price || 0) / 83).toFixed(2)) : addon.price
                                    return (
                                      <div
                                        key={addon.name}
                                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${item.selectedAddons?.find(a => a.name === addon.name)
                                          ? 'bg-black text-white border-black'
                                          : 'bg-gray-50 border-gray-100 text-gray-600'
                                          }`}
                                        onClick={() => toggleAddon(item.id, addon)}
                                      >
                                        <span className="text-[10px] font-bold">
                                          {addon.name} (+{isUSD ? '$' : '₹'}{addonDisplayPrice.toLocaleString(undefined, { minimumFractionDigits: isUSD ? 2 : 0, maximumFractionDigits: 2 })})
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Extra Line Items — mobile */}
                            {sourceProduct?.line_items && sourceProduct.line_items.length > 0 && (
                              <div className="space-y-2 pt-2 border-t border-gray-50">
                                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Extra Line Items</p>
                                <div className="flex flex-col gap-2">
                                  {sourceProduct.line_items.map((li, idx) => {
                                    const liDisplayPrice = isUSD ? Number(((li.price || 0) / 83).toFixed(2)) : li.price
                                    return (
                                      <div
                                        key={idx}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition-colors ${item.selectedLineItems?.find(l => l.description === li.description)
                                          ? 'bg-black text-white border-black'
                                          : 'bg-gray-50 border-gray-100 text-gray-600'
                                          }`}
                                        onClick={() => toggleLineItem(item.id, li)}
                                      >
                                        <span className="text-[10px] font-bold">{li.description}</span>
                                        <span className="text-[10px] font-bold ml-2">
                                          {liDisplayPrice > 0
                                            ? `+${isUSD ? '$' : '₹'}${liDisplayPrice.toLocaleString(undefined, { minimumFractionDigits: isUSD ? 2 : 0, maximumFractionDigits: 2 })}`
                                            : 'Included'}
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                              <span className="text-xs font-bold text-gray-400 uppercase">Subtotal</span>
                              <span className="text-lg font-black text-black">
                                {currency === 'INR' ? '₹' : '$'}{((item.price + (item.selectedAddons?.reduce((s, a) => s + (a.price || 0), 0) || 0) + (item.selectedLineItems?.reduce((s, l) => s + (l.price || 0), 0) || 0)) * item.qty).toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>
              </CardContent>
              {items.length > 0 && (
                <div className="bg-gray-50/50 p-8">
                  <div className="ml-auto max-w-sm space-y-4">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                      <span>Subtotal</span>
                      <span className="text-black font-bold">{currency === 'INR' ? '₹' : '$'}{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                      <span>Adjustment / Discount</span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">-{currency === 'INR' ? '₹' : '$'}</span>
                        <Input
                          type="number"
                          step={currency === 'USD' ? "0.01" : "1"}
                          className="h-9 w-32 rounded-lg border-gray-200 bg-white pl-7 pr-2 text-right font-bold text-black focus:bg-white"
                          value={discount || ""}
                          onChange={(e: any) => {
                            const val = e.target.value
                            setDiscount(val === "" ? 0 : parseFloat(val) || 0)
                          }}
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                      <span>Target Grand Total</span>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">{currency === 'INR' ? '₹' : '$'}</span>
                        <Input
                          type="number"
                          step={currency === 'USD' ? "0.01" : "1"}
                          className="h-9 w-32 rounded-lg border-gray-200 bg-white pl-7 pr-2 text-right font-bold text-black focus:bg-white"
                          value={totals.grand_total || ""}
                          onChange={(e: any) => {
                            const val = e.target.value
                            if (val === "") {
                              setDiscount(0)
                            } else {
                              const target = parseFloat(val) || 0
                              const diff = totals.subtotal - target
                              setDiscount(currency === 'USD' ? Math.max(0, Number(diff.toFixed(2))) : Math.max(0, Math.round(diff)))
                            }
                          }}
                          placeholder={totals.grand_total.toString()}
                        />
                      </div>
                    </div>

                    <div className="h-px bg-gray-200/80" />
                    <div className="flex items-end justify-between">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-black">Final Total</span>
                      <span className="text-3xl font-black tracking-tighter text-black">{currency === 'INR' ? '₹' : '$'}{totals.grand_total.toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Note Section */}
            <Card className="border-none bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 p-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-400">Note (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <textarea
                  className="w-full min-h-[100px] rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-y"
                  placeholder="Add any specific notes to be displayed above the Terms and Conditions..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* ── Terms & Conditions ──────────────────────────────────────────── */}
            <Card className="border-none bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 p-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-400">Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-1">
                  {nonWarrantyTerms.map((term) => (
                    <div
                      key={term.id}
                      className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50/50 transition-colors group cursor-pointer"
                      onClick={() => toggleTerm(term.id)}
                    >
                      <Checkbox
                        id={term.id}
                        checked={term.selected}
                        onCheckedChange={() => toggleTerm(term.id)}
                        className="mt-0.5 data-[state=checked]:bg-black data-[state=checked]:border-black"
                      />
                      <Label
                        htmlFor={term.id}
                        className="text-sm font-medium leading-relaxed text-gray-600 group-hover:text-black transition-colors cursor-pointer"
                      >
                        {term.text}
                      </Label>
                    </div>
                  ))}

                  <div className="pt-4">
                    <div className="flex items-baseline gap-2 px-3 mb-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Warranty:</span>
                      <span className="text-[10px] font-bold text-black">{selectedWarrantyLabel}</span>
                    </div>
                    <div className="ml-4 border-l-2 border-gray-100 pl-4 flex flex-col gap-1">
                      {warrantyTerms.map((term) => {
                        const label = term.text.split(':').slice(1).join(':').trim()
                        return (
                          <div
                            key={term.id}
                            className="flex items-center space-x-3 p-2.5 rounded-xl hover:bg-gray-50/50 transition-colors cursor-pointer group"
                            onClick={() => toggleTerm(term.id)}
                          >
                            <input
                              type="radio"
                              id={term.id}
                              name="warrantyGroup"
                              checked={term.selected}
                              onChange={() => toggleTerm(term.id)}
                              className="h-4 w-4 border-gray-300 focus:ring-black cursor-pointer accent-black"
                            />
                            <Label
                              htmlFor={term.id}
                              className="text-sm font-medium leading-relaxed text-gray-600 group-hover:text-black transition-colors cursor-pointer"
                            >
                              {label}
                            </Label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Download / Update PDF Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="button"
                suppressHydrationWarning
                disabled={saving}
                onClick={handleDownload}
                className="h-14 w-full max-w-md rounded-xl bg-black px-8 font-bold text-white shadow-xl shadow-black/20 hover:bg-black/90 active:scale-95 transition-all flex items-center justify-center gap-2 text-base"
              >
                <Download className="h-5 w-5" />
                {saving
                  ? "Saving & Generating PDF..."
                  : isEditMode
                    ? `Update & Download PDF (Rev ${(editingQuotation.revision_number || 0) + 1})`
                    : "Save & Download PDF"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
