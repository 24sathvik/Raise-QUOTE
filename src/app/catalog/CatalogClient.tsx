'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, Package, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface Product {
  id: string
  name: string
  description: string
  price: number
  image_url: string | null
  sku: string
  specs: any[]
  category: string
  active: boolean
}

export default function CatalogClient({ initialProducts }: { initialProducts: Product[] }) {
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const categories = useMemo(() => {
    const cats = new Set(initialProducts.map(p => p.category || 'General'))
    return ['All', ...Array.from(cats)].sort()
  }, [initialProducts])

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((product) => {
      const matchesSearch = 
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku?.toLowerCase().includes(search.toLowerCase()) ||
        product.description?.toLowerCase().includes(search.toLowerCase())
      
      const matchesCategory = selectedCategory === 'All' || (product.category || 'General') === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [initialProducts, search, selectedCategory])

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-400 hover:text-black hover:shadow-sm transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <h1 className="text-3xl font-black tracking-tight text-black">
              Product Catalog
            </h1>
            <p className="text-sm font-medium text-gray-400">
              View detailed pharmaceutical engineering specifications.
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products, SKUs, or descriptions..."
              className="h-12 rounded-xl border-none bg-white pl-11 shadow-sm ring-1 ring-gray-100 focus:ring-black transition-all"
            />
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 flex-nowrap w-full sm:w-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`flex-shrink-0 px-5 h-12 rounded-xl text-xs font-bold transition-all shadow-sm ring-1 ring-gray-100 uppercase tracking-widest ${
                  selectedCategory === category
                    ? 'bg-black text-white ring-black'
                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-black'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Results Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-black text-black">No products found</h3>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your search or category filter.</p>
            </div>
          ) : (
            filteredProducts.map((product, index) => (
              <Card
                key={product.id}
                className="group overflow-hidden border-none bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl transition-all hover:shadow-xl hover:shadow-black/5"
              >
                <div className="relative h-48 w-full bg-gray-50/50">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      priority={index < 6}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-contain p-6 transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-200">
                      <Package className="h-12 w-12" />
                    </div>
                  )}

                  <div className="absolute top-4 left-4">
                    <Badge className="bg-white/80 backdrop-blur-md text-black border-none font-bold text-[10px] uppercase tracking-wider px-3 py-1 shadow-sm">
                      {product.category || 'General'}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="p-6 pb-2">
                  <CardTitle className="text-lg font-black tracking-tight text-black uppercase">
                    {product.name}
                  </CardTitle>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {product.sku}
                  </p>
                </CardHeader>

                <CardContent className="p-6 pt-0 space-y-4">
                  <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">
                    {product.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black tracking-tighter text-black">
                      ₹{product.price ? product.price.toLocaleString() : '0'}
                    </span>
                  </div>

                  {Array.isArray(product.specs) && product.specs.length > 0 && (
                    <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-2">
                      {product.specs.slice(0, 2).map((spec: any, i: number) => (
                        <div key={i} className="space-y-0.5">
                          <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">
                            {spec.key}
                          </p>
                          <p className="text-[10px] font-bold text-black truncate">
                            {spec.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
