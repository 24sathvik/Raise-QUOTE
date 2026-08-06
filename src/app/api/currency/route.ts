import { NextResponse } from 'next/server'

// Cache rate in memory for 10 minutes to ensure instant response times
let cachedRate: number | null = null
let lastFetched: number = 0
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

export async function GET() {
  const now = Date.now()

  if (cachedRate && now - lastFetched < CACHE_TTL_MS) {
    return NextResponse.json({
      success: true,
      rate: cachedRate,
      base: 'USD',
      target: 'INR',
      cached: true,
      lastUpdated: new Date(lastFetched).toISOString(),
    })
  }

  try {
    // 1. Primary: open.er-api.com (free, high-reliability, no key required)
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 600 },
      headers: { 'User-Agent': 'Raise-Quotation/1.0' },
      signal: AbortSignal.timeout(3000),
    })

    if (res.ok) {
      const data = await res.json()
      if (data?.rates?.INR && typeof data.rates.INR === 'number') {
        cachedRate = Number(data.rates.INR.toFixed(2))
        lastFetched = now
        return NextResponse.json({
          success: true,
          rate: cachedRate,
          base: 'USD',
          target: 'INR',
          lastUpdated: new Date(lastFetched).toISOString(),
        })
      }
    }
  } catch (primaryErr) {
    console.warn('Primary currency API failed, trying fallback:', primaryErr)
  }

  try {
    // 2. Fallback: exchangerate-api.com
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(3000),
    })

    if (res.ok) {
      const data = await res.json()
      if (data?.rates?.INR && typeof data.rates.INR === 'number') {
        cachedRate = Number(data.rates.INR.toFixed(2))
        lastFetched = now
        return NextResponse.json({
          success: true,
          rate: cachedRate,
          base: 'USD',
          target: 'INR',
          lastUpdated: new Date(lastFetched).toISOString(),
        })
      }
    }
  } catch (fallbackErr) {
    console.warn('Fallback currency API failed:', fallbackErr)
  }

  // 3. Fallback to current market rate (~95.0 INR per USD)
  const defaultRate = 95.0
  return NextResponse.json({
    success: true,
    rate: cachedRate || defaultRate,
    base: 'USD',
    target: 'INR',
    fallback: true,
    lastUpdated: new Date().toISOString(),
  })
}
