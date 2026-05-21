import type { Metadata } from "next";
import { farcasterMiniAppEmbed } from "@/lib/farcaster";
import {
  siteDescription,
  siteKeywords,
  siteLogo,
  siteLogoAbsolute,
  siteName,
  siteOgImageAbsolute,
  siteOrigin,
  siteTitle,
  siteUrl,
  talentAppProjectVerification
} from "@/lib/seo";
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
  other: {
    "talentapp:project_verification": talentAppProjectVerification,
    "fc:miniapp": JSON.stringify(farcasterMiniAppEmbed),
    "fc:frame": JSON.stringify(farcasterMiniAppEmbed)
  },
  manifest: "/manifest.webmanifest",
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
        url: siteOgImageAbsolute,
        width: 1200,
        height: 630,
        alt: "PAPPARDELLE Faucet Mini App with crypto meatballs"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: siteOgImageAbsolute,
        alt: "PAPPARDELLE Faucet Mini App with crypto meatballs"
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
