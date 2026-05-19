import type { Metadata, Viewport } from "next";
import { Inter } from 'next/font/google'
import "./globals.css";
import { Toaster } from 'sonner'
import { AuthProvider } from '@/lib/hooks/use-auth'
import InstallPWA from '@/components/InstallPWA'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

export const metadata: Metadata = {
  title: "Zyxen — Quotation System",
  description: "Zyxen Quotation Management System",
  manifest: "/manifest.json",
  icons: {
    icon: "/Zyxen-logo.jpeg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Zyxen",
  },
  openGraph: {
    title: "Zyxen — Quotation System",
    description: "Create and manage professional quotations efficiently.",
    type: "website",
    locale: "en_US",
    siteName: "Zyxen",
  },
  twitter: {
    card: "summary_large_image",
    title: "Zyxen — Quotation System",
    description: "Create and manage professional quotations efficiently.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Zyxen" />
        <link rel="apple-touch-icon" href="/Zyxen-logo.jpeg" />
        <link rel="preload" as="image" href="/quotation-logo.png" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <AuthProvider>
          <Toaster position="top-center" richColors />
          {children}
          <InstallPWA />
        </AuthProvider>
        {/* Service Worker Registration */}
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .catch(function(err) { console.warn('SW registration failed:', err); });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
