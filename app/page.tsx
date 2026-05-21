import { FaucetApp } from "@/components/FaucetApp";
import { farcasterAppJsonLd } from "@/lib/farcaster";
import {
  rektaurantUrl,
  siteDescription,
  siteKeywords,
  siteLogoAbsolute,
  siteName,
  siteTitle,
  siteUrl,
  tokenUrl,
  vaultUrl,
  zoraUrl
} from "@/lib/seo";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}#website`,
      name: siteName,
      url: siteUrl,
      description: siteDescription,
      inLanguage: "en",
      keywords: siteKeywords.join(", "),
      publisher: {
        "@id": `${siteUrl}#creator`
      }
    },
    {
      "@type": "Person",
      "@id": `${siteUrl}#creator`,
      name: "pappardelle.eth",
      url: siteUrl,
      sameAs: [zoraUrl, rektaurantUrl]
    },
    {
      "@type": ["WebApplication", "SoftwareApplication"],
      "@id": `${siteUrl}#app`,
      name: siteTitle,
      url: siteUrl,
      image: siteLogoAbsolute,
      description: siteDescription,
      applicationCategory: "FinanceApplication",
      operatingSystem: "Any wallet-enabled browser",
      isAccessibleForFree: true,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock"
      },
      featureList: [
        "One-time PAPPARDELLE token claim on Base",
        "Base network wallet connection",
        "Vault donation flow for faucet refills",
        "Celo referral leaderboard",
        "MiniPay and Farcaster Mini App compatibility",
        "Links to PAPPARDELLE on Zora and Rektaurant"
      ],
      about: [
        {
          "@type": "Thing",
          name: "Base ecosystem"
        },
        {
          "@type": "Thing",
          name: "PAPPARDELLE utility token"
        },
        {
          "@type": "Thing",
          name: "Crypto faucet"
        }
      ],
      sameAs: [tokenUrl, vaultUrl, zoraUrl, rektaurantUrl]
    },
    farcasterAppJsonLd,
    {
      "@type": "BreadcrumbList",
      "@id": `${siteUrl}#breadcrumbs`,
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "PAPPARDELLE Faucet",
          item: siteUrl
        }
      ]
    }
  ]
};

export default function Home() {
  return (
    <main className="page-shell">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <FaucetApp />
    </main>
  );
}
