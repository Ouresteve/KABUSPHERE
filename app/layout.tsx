import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/lib/toast-context";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { CookieConsent } from "@/components/ui/CookieConsent";
import type { Viewport } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.kabusphere.app"),
  title: "KABUSphere | Kabarak Campus Community",
  description: "Connect with the Kabarak University community on KABUSphere. Share campus updates, discover what's happening, and explore a student marketplace built for Kabarak.",
  applicationName: "KABUSphere",
  alternates: {
    canonical: "/",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "KABUSphere",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "KABUSphere",
    title: "KABUSphere | Kabarak Campus Community",
    description: "Connect with Kabarak University students, share campus updates, and discover what's happening across campus.",
    images: [
      {
        url: "/images/logo.jpeg",
        width: 512,
        height: 512,
        alt: "KABUSphere Logo",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "KABUSphere | Kabarak Campus Community",
    description: "Connect with Kabarak University students, share campus updates, and discover what's happening across campus.",
    images: ["/images/logo.jpeg"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32", type: "image/x-icon" },
      { url: "/images/logo.jpeg", sizes: "192x192", type: "image/jpeg" },
    ],
    apple: "/images/logo.jpeg",
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#0047B3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0047B3" />
        <link rel="apple-touch-icon" href="/images/logo.jpeg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "KABUSphere",
              url: "https://www.kabusphere.app/",
            }),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          {children}
          <ToastContainer />
          <CookieConsent />
        </ToastProvider>
      </body>
    </html>
  );
}


