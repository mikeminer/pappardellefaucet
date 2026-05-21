import type { Metadata } from "next";
import { siteDescription, siteKeywords, siteLogo, siteLogoAbsolute, siteName, siteOrigin, siteTitle, siteUrl } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  applicationName: siteName,
  title: siteTitle,
  description: siteDescription,
  keywords: siteKeywords,
  category: "Web3",
  creator: "pappardelle.eth",
  publisher: "pappardelle.eth",
  alternates: {
    canonical: siteUrl
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  icons: {
    icon: [{ url: siteLogo, sizes: "512x512", type: "image/png" }],
    apple: [{ url: siteLogo, sizes: "512x512", type: "image/png" }]
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: siteLogoAbsolute,
        width: 512,
        height: 512,
        alt: "PAPPARDELLE plate with crypto meatballs"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: siteLogoAbsolute,
        alt: "PAPPARDELLE plate with crypto meatballs"
      }
    ]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
