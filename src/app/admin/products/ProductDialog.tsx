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
import { Textarea } from '@/components/ui/textarea'
import { Plus, Loader2, Image as ImageIcon, Trash2 } from 'lucide-react'
import { upsertProduct } from './actions'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Spec {
  key: string
  value: string
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  tax_percent: number
  image_url: string | null
  active: boolean
  image_format?: 'wide' | 'tall'
  sku?: string
  category?: string
  specs?: Spec[]
}

export default function ProductDialog({ product }: { product?: Product }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.image_url || null)
  const [specs, setSpecs] = useState<Spec[]>(product?.specs || [])

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    // Ensure ID is passed for updates
    if (product?.id) {
      formData.append('id', product.id)
    }

    // Client-side image upload
    const imageInput = form.querySelector('input[type="file"]') as HTMLInputElement
    const file = imageInput?.files?.[0]
    let imageUrl = product?.image_url

    if (file) {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random()}.${fileExt}`
      const filePath = `product-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('products')
        .upload(filePath, file)

      if (uploadError) {
        toast.error("Image upload failed: " + uploadError.message)
        setIsLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath)

      imageUrl = publicUrl
    }

    if (imageUrl) {
      formData.set('image_url', imageUrl)
    }

    // Add specs as JSON string
    formData.set('specs', JSON.stringify(specs))
    formData.delete('image') // Don't send file to server action

    try {
      const result = await upsertProduct(formData)

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`Product ${product ? 'updated' : 'created'} successfully`)
        setOpen(false)
      }
    } catch (error) {
      console.error(error)
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const addSpec = () => setSpecs([...specs, { key: '', value: '' }])
  const removeSpec = (index: number) => setSpecs(specs.filter((_, i) => i !== index))
  const updateSpec = (index: number, field: keyof Spec, value: string) => {
    const newSpecs = [...specs]
    newSpecs[index][field] = value
    setSpecs(newSpecs)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {product ? (
          <Button variant="ghost" size="sm" className="h-10 w-full justify-start px-3 text-base font-medium text-gray-600 hover:text-black hover:bg-gray-50">
            Edit
          </Button>
        ) : (
          <Button className="h-12 gap-2 rounded-xl bg-black px-6 text-lg font-bold text-white hover:bg-gray-900 shadow-lg shadow-black/20 transition-all">
            <Plus className="h-5 w-5" />
            Add Product
          </Button>
        )}
      </DialogTrigger>
      
      {/* BULLETPROOF SIZING: 
        1. Removed max-w-lg from dialog.tsx 
        2. Added sm:max-w-6xl here
        3. Added style={{ maxWidth: '90vw' }} to absolutely force it. 
      */}
      <DialogContent 
        className="sm:max-w-6xl w-full gap-0 p-0 overflow-hidden rounded-2xl border-none bg-white shadow-2xl h-[90vh] flex flex-col"
        style={{ maxWidth: '90vw' }}
      >
        <div className="border-b border-gray-100 bg-gray-50/50 p-8 flex-shrink-0">
          <DialogHeader>
            <DialogTitle className="text-3xl font-black tracking-tight text-black">
              {product ? 'Edit Product' : 'New Product'}
            </DialogTitle>
            <DialogDescription className="text-base font-medium text-gray-500 mt-2">
              {product ? 'Update product details and specifications' : 'Add a new product to your catalog'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-grow overflow-hidden">
          <div className="flex-grow overflow-y-auto p-10 space-y-10">
            {/* 2-Column Layout */}
            <div className="flex flex-col gap-12 lg:flex-row">
              
              {/* Left Column: Image */}
              <div className="flex-shrink-0">
                <Label className="mb-4 block text-sm font-bold uppercase tracking-wider text-gray-400">Product Image</Label>
                <div className="group relative flex h-[350px] w-[350px] items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50 transition-all hover:border-gray-300">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="h-full w-full object-contain p-4" />
                  ) : (
                    <div className="flex flex-col items-center gap-3 text-gray-400">
                      <ImageIcon className="h-12 w-12" />
                      <span className="text-sm font-bold uppercase">No Image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                    <Label htmlFor="image-upload" className="cursor-pointer rounded-xl bg-white px-5 py-3 text-sm font-bold text-black hover:bg-gray-100 transition-colors">
                      Change Image
                    </Label>
                  </div>
                </div>
                <Input
                  id="image-upload"
                  name="image"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* Right Column: Form Fields */}
              <div className="flex-1 space-y-8">
                <div className="grid gap-8 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="name" className="text-sm font-bold text-gray-700">Product Name</Label>
                    <Input
                      id="name"
                      name="name"
                      defaultValue={product?.name}
                      placeholder="e.g. Laminar Air Flow"
                      required
                      className="h-14 rounded-xl border-gray-200 bg-gray-50/50 font-medium focus:bg-white focus:ring-0 text-lg px-4"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="category" className="text-sm font-bold text-gray-700">Category</Label>
                    <Input
                      id="category"
                      name="category"
                      defaultValue={product?.category}
                      placeholder="e.g. Cleanroom Equipment"
                      className="h-14 rounded-xl border-gray-200 bg-gray-50/50 font-medium focus:bg-white focus:ring-0 text-lg px-4"
                    />
                  </div>
                </div>

                <div className="grid gap-8 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="sku" className="text-sm font-bold text-gray-700">SKU(PRODUCT ID)</Label>
                    <Input
                      id="sku"
                      name="sku"
                      defaultValue={product?.sku}
                      placeholder="e.g. SKU-123"
                      className="h-14 rounded-xl border-gray-200 bg-gray-50/50 font-medium focus:bg-white focus:ring-0 text-lg px-4"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="image_format" className="text-sm font-bold text-gray-700">Display Format</Label>
                    <Select name="image_format" defaultValue={product?.image_format || 'wide'}>
                      <SelectTrigger className="h-14 rounded-xl border-gray-200 bg-gray-50/50 font-medium focus:bg-white focus:ring-0 text-lg px-4">
                        <SelectValue placeholder="Select format" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-gray-100 shadow-xl">
                        <SelectItem value="wide" className="text-base py-3 font-medium">Wide (Standard)</SelectItem>
                        <SelectItem value="tall" className="text-base py-3 font-medium">Tall (Side-by-side)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="description" className="text-sm font-bold text-gray-700">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    defaultValue={product?.description}
                    placeholder="Product description..."
                    className="min-h-[200px] rounded-xl border-gray-200 bg-gray-50/50 p-4 font-medium focus:bg-white focus:ring-0 resize-y text-lg"
                  />
                </div>

                <div className="grid gap-8 sm:grid-cols-2">
                  <div className="space-y-3">
                    <Label htmlFor="price" className="text-sm font-bold text-gray-700">Base Price (₹)</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">₹</span>
                      <Input
                        id="price"
                        name="price"
                        type="number"
                        step="0.01"
                        defaultValue={product?.price}
                        placeholder="0.00"
                        required
                        className="h-14 rounded-xl border-gray-200 bg-gray-50/50 pl-10 font-bold focus:bg-white focus:ring-0 text-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="active" className="text-sm font-bold text-gray-700">Status</Label>
                    <div className="flex h-14 items-center gap-4 rounded-xl border border-gray-200 bg-gray-50/50 px-5">
                      <input
                        type="checkbox"
                        id="active"
                        name="active"
                        value="true"
                        defaultChecked={product ? product.active : true}
                        className="h-6 w-6 rounded border-gray-300 text-black focus:ring-black"
                      />
                      <Label htmlFor="active" className="text-base font-bold text-gray-600 cursor-pointer">Active Product</Label>
                    </div>
                  </div>
                </div>

                {/* Specs Section - Expanded */}
                <div className="space-y-5 pt-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-bold text-gray-700">Specifications / Features</Label>
                    <Button type="button" onClick={addSpec} variant="outline" size="sm" className="h-10 px-4 text-sm border-dashed gap-2 font-bold hover:bg-gray-100 transition-colors">
                      <Plus className="h-4 w-4" /> Add Spec
                    </Button>
                  </div>
                  <div className="space-y-3 bg-gray-50/30 p-6 rounded-2xl border border-gray-100">
                    {specs.map((spec, index) => (
                      <div key={index} className="flex gap-4">
                        <Input
                          placeholder="Feature/Key (e.g. Dimensions)"
                          value={spec.key}
                          onChange={(e) => updateSpec(index, 'key', e.target.value)}
                          className="h-14 text-base bg-white shadow-sm border-gray-200 w-1/3"
                        />
                        <Input
                          placeholder="Value (e.g. 10x20x30 cm)"
                          value={spec.value}
                          onChange={(e) => updateSpec(index, 'value', e.target.value)}
                          className="h-14 text-base bg-white shadow-sm border-gray-200 flex-1"
                        />
                        <Button type="button" onClick={() => removeSpec(index)} variant="ghost" size="icon" className="h-14 w-14 bg-white border border-gray-200 shadow-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                    {specs.length === 0 && (
                      <p className="text-sm text-gray-400 font-medium italic text-center py-6">No specifications added yet. Click "Add Spec" to start.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 bg-gray-50/50 p-8 flex justify-end gap-4 flex-shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="h-14 px-8 rounded-xl border-gray-200 text-base font-bold text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-14 px-12 rounded-xl bg-black text-base font-bold text-white shadow-lg shadow-black/20 hover:bg-gray-900 transition-all transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                product ? 'Save Changes' : 'Create Product'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
