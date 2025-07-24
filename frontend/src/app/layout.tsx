import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import QueryProvider from "@/components/QueryProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GhostCDN | Fast, Free File Hosting",
  description: "Upload your files instantly and get CDN links that last forever. Free file hosting with no strings attached.",
  keywords: ["cdn", "image hosting", "free cdn", "image upload", "file upload", "hack club", "ghostcdn", "Summer Of Making"],
  authors: [{ name: "GhostCDN Team" }],
  creator: "GhostCDN",
  publisher: "GhostCDN",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  openGraph: {
    title: "GhostCDN | Fast, Free File Hosting",
    description: "Upload your files instantly and get CDN links that last forever. Free file hosting with no strings attached.",
    url: "https://ghostcdn.xyz",
    siteName: "GhostCDN",
    images: [
      {
        url: "https://ghostcdn.xyz/GCDN.png",
        width: 1200,
        height: 630,
        alt: "GhostCDN - Fast, Free File Hosting",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GhostCDN | Fast, Free File Hosting",
    description: "Upload your files instantly and get CDN links that last forever. Free file hosting with no strings attached.",
    images: ["https://ghostcdn.xyz/GCDN.png"],
    creator: "@ghostcdn",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <SettingsProvider>
            <AuthProvider>
              <NotificationProvider>
                {children}
              </NotificationProvider>
            </AuthProvider>
          </SettingsProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
