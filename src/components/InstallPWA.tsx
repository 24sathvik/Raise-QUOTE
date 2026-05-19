'use client'

import { useState, useEffect } from 'react'
import { X, Download, Share } from 'lucide-react'
import { usePWAInstall } from '@/hooks/usePWAInstall'

export default function InstallPWA() {
  const { canInstall, isInstalled, isIOS, install } = usePWAInstall()
  const [dismissed, setDismissed] = useState(true) // default hidden, check localStorage

  useEffect(() => {
    const wasDismissed = localStorage.getItem('pwa-banner-dismissed') === 'true'
    if (!wasDismissed) {
      setDismissed(false)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('pwa-banner-dismissed', 'true')
    setDismissed(true)
  }

  const handleInstall = async () => {
    await install()
    setDismissed(true)
  }

  // Don't show if: installed, dismissed, or nothing to show
  if (isInstalled || dismissed) return null
  if (!canInstall && !isIOS) return null

  return (
    <div
      role="banner"
      aria-label="Install app banner"
      className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-black/10 transition-all duration-300"
    >
      <div className="flex items-start gap-4 p-5">
        {/* App icon */}
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Zyxen-logo.jpeg"
            alt="Zyxen"
            className="h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-black tracking-tight">Install Zyxen</p>
          <p className="mt-0.5 text-xs font-medium text-gray-500 leading-snug">
            {isIOS
              ? 'Tap Share → Add to Home Screen for one‑tap access'
              : 'Install for offline access and faster load times'}
          </p>

          {/* iOS instruction */}
          {isIOS && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
              <Share className="h-4 w-4 flex-shrink-0 text-gray-500" />
              <span className="text-xs font-bold text-gray-600">
                Tap <span className="text-black">Share</span> → <span className="text-black">Add to Home Screen</span>
              </span>
            </div>
          )}

          {/* Chrome/Android/Desktop install button */}
          {!isIOS && canInstall && (
            <button
              onClick={handleInstall}
              className="mt-3 flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-xs font-black text-white transition-all hover:bg-gray-900 active:scale-95"
            >
              <Download className="h-3.5 w-3.5" />
              Install App
            </button>
          )}
        </div>

        {/* Dismiss */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install banner"
          className="flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-black"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
