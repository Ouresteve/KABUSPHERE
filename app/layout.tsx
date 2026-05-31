import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KABUSphere - Campus Social Network",
  description: "Connect with your campus community. Share, discover, and engage with students from Kabarak University.",
  applicationName: "KABUSphere",
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
    title: "KABUSphere - Campus Social Network",
    description: "Connect with your campus community. Share, discover, and engage with students from Kabarak University.",
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
    title: "KABUSphere - Campus Social Network",
    description: "Connect with your campus community.",
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
  viewport: "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes, viewport-fit=cover",
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
<link rel="apple-touch-icon" href="/images/logo.jpeg" /></head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}


