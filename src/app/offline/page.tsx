'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="flex max-w-sm flex-col items-center gap-6 text-center">
        {/* Icon */}
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-black shadow-xl shadow-black/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3l18 18M8.111 8.111A5.5 5.5 0 0115.9 15.9M1.5 8.25a10.5 10.5 0 0121 0M5.25 12A6.75 6.75 0 0118.75 12M9 15.75a3 3 0 006 0"
            />
          </svg>
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight text-black">You are offline</h1>
          <p className="text-sm font-medium leading-relaxed text-gray-500">
            No internet connection detected. Check your connection and try again.
          </p>
        </div>

        {/* Retry button */}
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-xl bg-black px-8 py-3 text-sm font-black text-white shadow-lg shadow-black/20 transition-all hover:bg-gray-900 active:scale-95"
        >
          Try Again
        </button>
      </div>
    </div>
  )
}
