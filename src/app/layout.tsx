import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/sonner";
import { ZiwaphiFloatingButton } from "@/components/ziwaphi";
import { CookieConsent } from "@/components/shared/cookie-consent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ziyawa.co.za'

export const metadata: Metadata = {
  title: {
    default: "Ziyawa | Your Event Operating System",
    template: "%s | Ziyawa",
  },
  description: "South Africa's event marketplace connecting organizers, artists, and groovists. Discover events, book artists, and join the groove.",
  keywords: ["events", "south africa", "artists", "booking", "concerts", "amapiano", "music", "ziyawa", "event platform", "book artists"],
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    siteName: 'Ziyawa',
    title: 'Ziyawa | Your Event Operating System',
    description: "South Africa's event marketplace connecting organizers, artists, and groovists.",
    url: siteUrl,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ziyawa | Your Event Operating System',
    description: "South Africa's event marketplace connecting organizers, artists, and groovists.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <ZiwaphiFloatingButton />
          <CookieConsent />
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
