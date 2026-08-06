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
  Pencil,
  RefreshCw
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
const MARGIN_PERCENTAGE = 50 // Sales sees 50% markup over base price

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
  _rev?: number
  _currency?: string
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

  // Live USD Exchange Rate State
  const [usdRate, setUsdRate] = useState<number>(95.0)
  const [rateLoading, setRateLoading] = useState(false)

  // Fetch live exchange rate on load
  const fetchLiveRate = useCallback(async () => {
    try {
      setRateLoading(true)
      const res = await fetch('/api/currency')
      const data = await res.json()
      if (data?.rate && typeof data.rate === 'number') {
        setUsdRate(data.rate)
      }
    } catch (e) {
      console.warn("Could not fetch live currency rate:", e)
    } finally {
      setRateLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLiveRate()
  }, [fetchLiveRate])

  // Initial enriched items if editing an existing quotation
  const initialEnrichedItems = useMemo(() => {
    if (!editingQuotation?.items_json) return []
    try {
      const raw = typeof editingQuotation.items_json === 'string'
        ? JSON.parse(editingQuotation.items_json)
        : editingQuotation.items_json
      const itemsList = Array.isArray(raw) ? raw : (raw?.items || [])
      return itemsList.map((item: any, idx: number) => {
        const source = initialProducts.find((p: Product) => p.id === item.product_id || p.name === item.name)
        const basePrice = Number(item.base_price ?? (source?.price || item.price || 0))
        const mrp = Number(item.mrp ?? (source ? Math.round(source.price * (1 + MARGIN_PERCENTAGE / 100)) : (item.price || basePrice || 0)))
        const price = Number(item.price ?? mrp ?? basePrice ?? 0)
        const qty = Number(item.qty ?? item.quantity ?? 1)
        return {
          id: item.id || `edit-item-${idx}-${Math.random().toString(36).slice(2)}`,
          product_id: item.product_id || source?.id || `product-${idx}`,
          name: item.name || source?.name || 'Unnamed Product',
          description: item.description || source?.description || '',
          qty: isNaN(qty) || qty < 1 ? 1 : qty,
          base_price: isNaN(basePrice) ? 0 : basePrice,
          mrp: isNaN(mrp) ? (isNaN(price) ? 0 : price) : mrp,
          price: isNaN(price) ? 0 : price,
          image_url: item.image_url || source?.image_url || null,
          sku: item.sku || source?.sku || '',
          selectedAddons: Array.isArray(item.selectedAddons) ? item.selectedAddons : [],
          specs: Array.isArray(item.specs) ? item.specs : (source?.specs || []),
          features: Array.isArray(item.features) ? item.features : (source?.features || []),
          image_format: item.image_format || source?.image_format || 'wide',
          availableLineItems: Array.isArray(item.availableLineItems)
            ? item.availableLineItems
            : (source?.line_items ? [...source.line_items] : []),
          selectedLineItems: Array.isArray(item.selectedLineItems)
            ? item.selectedLineItems
            : (item.availableLineItems ? [...item.availableLineItems] : (source?.line_items ? [...source.line_items] : [])),
          _rev: item._rev,
          _currency: item._currency
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
    number: (editingQuotation?.quotation_number || "RLE-...").replace(/\(\d+\)$/, '').trim(),
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
  const [currency, setCurrency] = useState<Currency>(
    editingQuotation?.items_json?.[0]?._currency === 'USD' ? 'USD' : 'INR'
  )
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
        number: (editingQuotation.quotation_number || "RLE-...").replace(/\(\d+\)$/, '').trim(),
        date: (editingQuotation.created_at || '').split("T")[0] || new Date().toISOString().split("T")[0],
        validity_days: 30,
      })
      setDiscount(editingQuotation.discount_total || 0)
      if (editingQuotation.items_json?.[0]?._currency) {
        setCurrency(editingQuotation.items_json[0]._currency as Currency)
      }
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
    const DRAFT_VERSION = 'v4'
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
        JSON.stringify({ _v: 'v4', items, customer, meta, discount, terms, note, currency })
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
    const conversionRate = usdRate || 95.0
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
  }, [currency, usdRate])

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
    const conversionRate = usdRate || 95.0
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
  }, [currency, usdRate])

  const toggleLineItem = useCallback((itemId: string, li: { description: string; price: number }) => {
    const isUSD = currency === 'USD'
    const conversionRate = usdRate || 95.0
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
  }, [currency, usdRate])

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
        // Increment revision: 0 -> 1, 1 -> 2, 2 -> 3, etc.
        const currentRev = editingQuotation.revision_number ? Number(editingQuotation.revision_number) : 0
        revNumber = currentRev + 1
        
        const cleanBaseNumber = (meta.number || editingQuotation.quotation_number || 'RLE-101').replace(/\(\d+\)$/, '').trim()
        const targetId = editingQuotation.id || editingQuotation.quotation_number
        
        const result = await updateQuotation(targetId, {
          quotation_number: cleanBaseNumber,
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
          revision_number: revNumber,
          currency
        })

        if (result.error) throw new Error(result.error)
        quotationData = { ...result.data!, quotation_number: cleanBaseNumber, revision_number: revNumber }
      } else {
        const cleanBaseNumber = (meta.number || 'RLE-101').replace(/\(\d+\)$/, '').trim()
        const result = await saveQuotation({
          quotation_number: cleanBaseNumber,
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
          revision_number: 0,
          currency
        })

        if (result.error) throw new Error(result.error)
        quotationData = { ...result.data!, quotation_number: cleanBaseNumber, revision_number: 0 }
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
      const cleanQuoteNumber = (quotationData.quotation_number || 'RLE-101').replace(/\(\d+\)$/, '').trim()
      const storageFileName = `${cleanQuoteNumber}_rev${revNumber}_${quotationData.id}.pdf`
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
        toast.success(`Quotation ${cleanQuoteNumber} updated to Revision #${revNumber}`)
        localStorage.removeItem("quotation_draft")
        setTimeout(() => {
          window.location.href = user?.role === 'admin' ? '/admin/quotations' : '/quotations'
        }, 1200)
      } else {
        toast.success(`Quotation ${cleanQuoteNumber} saved & downloaded!`)
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
  const warrantyTerms = terms.filter(t => WARRANTY_TERMS.includes(t.text))
  const nonWarrantyTerms = terms.filter(t => !WARRANTY_TERMS.includes(t.text))
  const selectedWarrantyTerm = warrantyTerms.find(t => t.selected)
  const selectedWarrantyLabel = selectedWarrantyTerm
    ? selectedWarrantyTerm.text.split(':').slice(1).join(':').trim()
    : "None selected"

  const conversionRate = usdRate || 95.0

  return (
    <div className="flex min-h-screen bg-[#FDFDFD]">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Modern High-End Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-100 bg-white transition-transform duration-200 lg:translate-x-0 ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-50">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white font-bold text-sm shadow-sm">
              R
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-widest text-black">RAISE LABS</span>
              <span className="text-[10px] font-bold text-gray-400">QUOTATION PRO</span>
            </div>
          </Link>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          <Link
            href="/"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
              !isEditMode
                ? "bg-black text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-black"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            Create Quotation
          </Link>
          <Link
            href="/quotations"
            className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
              isEditMode
                ? "bg-black text-white shadow-sm"
                : "text-gray-500 hover:bg-gray-50 hover:text-black"
            }`}
          >
            <FileText className="h-4 w-4" />
            My Quotations
          </Link>
          {user?.role === 'admin' && (
            <Link
              href="/admin/quotations"
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-black transition-all"
            >
              <Package className="h-4 w-4" />
              Admin Portal
            </Link>
          )}
        </nav>

        {/* User Info & Logout Footer */}
        <div className="border-t border-gray-50 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 font-bold text-black border border-gray-100 text-xs">
              {user?.full_name?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-xs font-black text-black">{user?.full_name || "Sales User"}</span>
              <span className="truncate text-[10px] font-bold text-gray-400 uppercase tracking-widest">{user?.role || "Sales"}</span>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Sticky Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-100 bg-white/80 px-4 sm:px-8 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-black sm:text-lg">
                {isEditMode ? "Edit Quotation" : "New Quotation"}
              </h1>
              {isEditMode && (
                <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200 text-xs font-bold">
                  Editing Rev #{(editingQuotation?.revision_number || 0) + 1}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={clearQuotation}
              className="h-9 gap-1.5 rounded-xl border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 hover:text-black"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {isEditMode ? "Discard Changes" : "Clear Draft"}
            </Button>

            <Button
              type="button"
              suppressHydrationWarning
              disabled={saving}
              onClick={handleDownload}
              className="h-9 gap-2 rounded-xl bg-black px-4 text-xs font-bold text-white shadow-sm hover:bg-black/90 active:scale-95 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              {saving
                ? "Generating..."
                : isEditMode
                  ? `Update & Download (Rev ${(editingQuotation?.revision_number || 0) + 1})`
                  : "Save & Download PDF"}
            </Button>
          </div>
        </header>

        {/* Builder Form Content */}
        <div className="p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-8">
          {/* Edit Mode Alert Banner */}
          {isEditMode && (
            <div className="flex items-center justify-between rounded-2xl bg-amber-50 border border-amber-200 p-4 px-6 text-amber-950">
              <div className="flex items-center gap-3">
                <Pencil className="h-5 w-5 text-amber-600" />
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-amber-800">
                    Modifying Existing Quotation: <span className="font-mono text-black font-bold">{meta.number}</span>
                  </div>
                  <div className="text-xs text-amber-700 font-medium">
                    Saving will advance this quotation to <span className="font-bold">Revision #{(editingQuotation?.revision_number || 0) + 1}</span> ({meta.number}({(editingQuotation?.revision_number || 0) + 1})).
                  </div>
                </div>
              </div>
              <Link
                href="/"
                className="text-xs font-bold underline hover:text-amber-800 transition-colors"
              >
                Create New Instead
              </Link>
            </div>
          )}

          <div className="space-y-6">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Customer Details Card */}
              <Card className="border-none bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl lg:col-span-2 overflow-hidden">
                <CardHeader className="border-b border-gray-50 p-6">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-400">Customer Details</CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Client / Contact Name *</Label>
                    <Input
                      placeholder="e.g. Dr. John Doe"
                      className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm font-medium"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Company / Organization</Label>
                    <Input
                      placeholder="e.g. Apex Bio-Pharma Ltd."
                      className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm font-medium"
                      value={customer.company}
                      onChange={(e) => setCustomer({ ...customer, company: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Phone Number</Label>
                    <Input
                      placeholder="+91 98765 43210"
                      className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm font-medium"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Email Address</Label>
                    <Input
                      placeholder="john@apexbiopharma.com"
                      type="email"
                      className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm font-medium"
                      value={customer.email}
                      onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-bold text-gray-700">Billing / Delivery Address</Label>
                    <Input
                      placeholder="Street, City, State, PIN code"
                      className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm font-medium"
                      value={customer.address}
                      onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Quotation Metadata Card */}
              <Card className="border-none bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
                <CardHeader className="border-b border-gray-50 p-6">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-400">Quotation Info</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-700">Quote Reference No.</Label>
                      {!isEditMode && (
                        <span className="text-[10px] text-gray-400 font-medium">(Editable)</span>
                      )}
                    </div>
                    <Input
                      readOnly={isEditMode}
                      className={`h-11 rounded-xl border-gray-200 font-mono text-sm font-bold text-black ${
                        isEditMode ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50/50 focus:bg-white focus:border-black'
                      }`}
                      value={isEditMode ? `${meta.number}(${(editingQuotation?.revision_number || 0) + 1})` : meta.number}
                      onChange={(e) => {
                        if (!isEditMode) {
                          setMeta(prev => ({ ...prev, number: e.target.value }))
                        }
                      }}
                      placeholder="e.g. RLE-101"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-gray-700">Issue Date</Label>
                    <Input
                      type="date"
                      className="h-11 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm font-medium"
                      value={meta.date}
                      onChange={(e) => setMeta({ ...meta, date: e.target.value })}
                    />
                  </div>

                  {/* Currency Toggle with Live Exchange Rate */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-gray-700">Currency</Label>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                        <span>1 USD = ₹{conversionRate}</span>
                        <button
                          type="button"
                          onClick={fetchLiveRate}
                          disabled={rateLoading}
                          title="Refresh live USD rate"
                          className="hover:text-black transition-colors"
                        >
                          <RefreshCw className={`h-3 w-3 ${rateLoading ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (currency !== 'INR') {
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
                        className={`flex-1 h-11 rounded-xl font-bold text-xs transition-all ${currency === 'INR'
                          ? 'bg-black text-white shadow-sm'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                      >
                        INR (₹)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (currency !== 'USD') {
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
                        className={`flex-1 h-11 rounded-xl font-bold text-xs transition-all ${currency === 'USD'
                          ? 'bg-black text-white shadow-sm'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                          }`}
                      >
                        USD ($)
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Line Items Card */}
            <Card className="border-none bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-col gap-4 border-b border-gray-50 p-6 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-400">Line Items</CardTitle>
                <Popover open={isProductOpen} onOpenChange={setIsProductOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="h-10 w-full rounded-xl gap-2 border-gray-200 font-bold hover:bg-black hover:text-white transition-all sm:w-auto text-xs">
                      <Plus className="h-4 w-4" /> Add Product
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[calc(100vw-32px)] max-w-[400px] p-0 rounded-2xl shadow-2xl border-none" align="end">
                    <Command className="rounded-2xl">
                      <CommandInput placeholder="Search products..." className="h-12 border-none focus:ring-0 text-xs" />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup className="p-2">
                          {initialProducts.map((product) => {
                            const isUSD = currency === 'USD'
                            const convertedPrice = isUSD ? (product.price / conversionRate) : product.price
                            const displayedMrp = isUSD
                              ? Number((convertedPrice * (1 + MARGIN_PERCENTAGE / 100)).toFixed(2))
                              : Math.round(convertedPrice * (1 + MARGIN_PERCENTAGE / 100))
                            return (
                              <CommandItem
                                key={product.id}
                                onSelect={() => addItem(product)}
                                className="flex items-center gap-3 rounded-xl p-3 cursor-pointer aria-selected:bg-gray-50 transition-all"
                              >
                                <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-gray-100 bg-white shrink-0">
                                  {product.image_url && <Image src={product.image_url} alt={product.name} fill className="object-contain p-1" />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-black truncate">{product.name}</span>
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
                          const itemTotalAddons = item.selectedAddons?.reduce((sum, a) => sum + (a.price || 0), 0) || 0
                          const itemTotalLineItems = item.selectedLineItems?.reduce((sum, l) => sum + (l.price || 0), 0) || 0
                          const totalUnitSellingPrice = (item.price || 0) + itemTotalAddons + itemTotalLineItems
                          const lineTotal = totalUnitSellingPrice * (item.qty || 1)
                          const minAllowed = item.base_price || 0
                          const isUnderMin = (item.price || 0) < minAllowed

                          return (
                            <TableRow key={item.id} className="border-gray-50 hover:bg-gray-50/50 transition-colors">
                              <TableCell className="px-8 py-6 align-top">
                                <div className="flex gap-4">
                                  <div className="relative h-16 w-16 overflow-hidden rounded-xl border border-gray-100 bg-white shrink-0">
                                    {item.image_url && (
                                      <Image src={item.image_url} alt={item.name} fill className="object-contain p-1.5" />
                                    )}
                                  </div>
                                  <div className="space-y-3 flex-1 min-w-0">
                                    <div>
                                      <h4 className="text-sm font-bold text-black">{item.name}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-[10px] font-bold text-gray-500 border-gray-200">
                                          MRP: {currency === 'INR' ? '₹' : '$'}{(item.mrp || 0).toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] font-bold text-gray-400 border-gray-200">
                                          Min: {currency === 'INR' ? '₹' : '$'}{minAllowed.toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Line Items selection */}
                                    {item.availableLineItems && item.availableLineItems.length > 0 && (
                                      <div className="space-y-1.5 pt-1">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Included In Offer:</span>
                                        <div className="space-y-1">
                                          {item.availableLineItems.map((li, idx) => {
                                            const isSelected = item.selectedLineItems?.some(s => s.description === li.description)
                                            return (
                                              <div
                                                key={idx}
                                                onClick={() => toggleLineItem(item.id, li)}
                                                className="flex items-center gap-2 cursor-pointer group"
                                              >
                                                <Checkbox checked={isSelected} className="data-[state=checked]:bg-black data-[state=checked]:border-black" />
                                                <span className="text-xs text-gray-600 group-hover:text-black transition-colors font-medium">
                                                  {li.description} {li.price > 0 ? `(+${currency === 'INR' ? '₹' : '$'}${Number(li.price).toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })})` : ''}
                                                </span>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Accessories selection */}
                                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                                      <div className="space-y-1.5 pt-1">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Standard Accessories:</span>
                                        <div className="flex flex-wrap gap-1.5">
                                          {item.selectedAddons.map((addon, idx) => (
                                            <span key={idx} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                                              • {addon.name}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>

                              {/* Quantity */}
                              <TableCell className="align-top py-6 text-center">
                                <Input
                                  type="number"
                                  min="1"
                                  className="h-10 w-16 mx-auto text-center font-bold text-xs rounded-xl border-gray-200"
                                  value={item.qty || 1}
                                  onChange={(e) => updateItem(item.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                                />
                              </TableCell>

                              {/* Unit Selling Price Input */}
                              <TableCell className="align-top py-6">
                                <div className="space-y-1">
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                                      {currency === 'INR' ? '₹' : '$'}
                                    </span>
                                    <Input
                                      type="number"
                                      step={currency === 'USD' ? "0.01" : "1"}
                                      className={`h-10 pl-7 font-bold text-xs rounded-xl border-gray-200 ${isUnderMin ? 'border-red-400 focus:border-red-500 bg-red-50/20' : ''}`}
                                      value={item.price || ""}
                                      onChange={(e) => {
                                        const val = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                                        updateItem(item.id, { price: val })
                                      }}
                                    />
                                  </div>
                                  {isUnderMin && (
                                    <span className="text-[10px] font-bold text-red-500 block">
                                      Below Base Price ({currency === 'INR' ? '₹' : '$'}{minAllowed})
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Line Total */}
                              <TableCell className="align-top py-6 text-right font-black text-sm text-black">
                                {currency === 'INR' ? '₹' : '$'}{lineTotal.toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}
                              </TableCell>

                              {/* Delete Action */}
                              <TableCell className="align-top py-6 text-center">
                                <button
                                  onClick={() => removeItem(item.id)}
                                  className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
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

                  {/* Mobile Cards View */}
                  <div className="divide-y divide-gray-100 md:hidden">
                    {items.length === 0 ? (
                      <div className="p-8 text-center text-sm font-medium text-gray-400">
                        Add products to build your quotation
                      </div>
                    ) : (
                      items.map((item) => {
                        const itemTotalAddons = item.selectedAddons?.reduce((sum, a) => sum + (a.price || 0), 0) || 0
                        const itemTotalLineItems = item.selectedLineItems?.reduce((sum, l) => sum + (l.price || 0), 0) || 0
                        const totalUnitSellingPrice = (item.price || 0) + itemTotalAddons + itemTotalLineItems
                        const lineTotal = totalUnitSellingPrice * (item.qty || 1)

                        return (
                          <div key={item.id} className="p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex gap-3">
                                <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-gray-100 bg-white shrink-0">
                                  {item.image_url && (
                                    <Image src={item.image_url} alt={item.name} fill className="object-contain p-1" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-black">{item.name}</h4>
                                  <span className="text-[10px] font-bold text-gray-400">
                                    MRP: {currency === 'INR' ? '₹' : '$'}{(item.mrp || 0).toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              </div>
                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-gray-400 uppercase">Qty</Label>
                                <Input
                                  type="number"
                                  min="1"
                                  className="h-9 rounded-lg font-bold text-xs"
                                  value={item.qty || 1}
                                  onChange={(e) => updateItem(item.id, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] font-bold text-gray-400 uppercase">Unit Price</Label>
                                <Input
                                  type="number"
                                  step={currency === 'USD' ? "0.01" : "1"}
                                  className="h-9 rounded-lg font-bold text-xs"
                                  value={item.price || ""}
                                  onChange={(e) => updateItem(item.id, { price: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-gray-50 text-xs">
                              <span className="text-gray-400 font-bold uppercase text-[10px]">Total</span>
                              <span className="font-black text-black">
                                {currency === 'INR' ? '₹' : '$'}{lineTotal.toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Summary & Adjustments Section */}
                {items.length > 0 && (
                  <div className="bg-gray-50/50 p-6 sm:p-8 border-t border-gray-50">
                    <div className="ml-auto max-w-sm space-y-4">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span>Subtotal</span>
                        <span className="text-black font-bold">
                          {currency === 'INR' ? '₹' : '$'}{totals.subtotal.toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span>Adjustment / Discount</span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                            -{currency === 'INR' ? '₹' : '$'}
                          </span>
                          <Input
                            type="number"
                            step={currency === 'USD' ? "0.01" : "1"}
                            className="h-9 w-32 rounded-lg border-gray-200 bg-white pl-7 pr-2 text-right font-bold text-black focus:bg-white text-xs"
                            value={discount || ""}
                            onChange={(e) => {
                              const val = e.target.value
                              setDiscount(val === "" ? 0 : parseFloat(val) || 0)
                            }}
                            placeholder="0"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <span>Target Grand Total</span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                            {currency === 'INR' ? '₹' : '$'}
                          </span>
                          <Input
                            type="number"
                            step={currency === 'USD' ? "0.01" : "1"}
                            className="h-9 w-32 rounded-lg border-gray-200 bg-white pl-7 pr-2 text-right font-bold text-black focus:bg-white text-xs"
                            value={totals.grand_total || ""}
                            onChange={(e) => {
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
                        <span className="text-[10px] font-black uppercase tracking-widest text-black">Final Total</span>
                        <span className="text-2xl sm:text-3xl font-black tracking-tight text-black">
                          {currency === 'INR' ? '₹' : '$'}{totals.grand_total.toLocaleString(undefined, { minimumFractionDigits: currency === 'USD' ? 2 : 0, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Note Section */}
            <Card className="border-none bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl overflow-hidden">
              <CardHeader className="border-b border-gray-50 p-6">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-gray-400">Note (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <textarea
                  className="w-full min-h-[100px] rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-y"
                  placeholder="Add any specific notes to be displayed above the Terms and Conditions..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Terms & Conditions */}
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
                        className="text-xs font-medium leading-relaxed text-gray-600 group-hover:text-black transition-colors cursor-pointer"
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
                              className="text-xs font-medium leading-relaxed text-gray-600 group-hover:text-black transition-colors cursor-pointer"
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

            {/* Bottom Large Download Button */}
            <div className="flex justify-center pt-4">
              <Button
                type="button"
                suppressHydrationWarning
                disabled={saving}
                onClick={handleDownload}
                className="h-14 w-full max-w-md rounded-xl bg-black px-8 font-bold text-white shadow-xl shadow-black/10 hover:bg-black/90 active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Download className="h-5 w-5" />
                {saving
                  ? "Saving & Generating PDF..."
                  : isEditMode
                    ? `Update & Download PDF (Rev ${(editingQuotation?.revision_number || 0) + 1})`
                    : "Save & Download PDF"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
