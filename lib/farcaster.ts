import {
  siteDescription,
  siteLogoAbsolute,
  siteName,
  siteOrigin,
  siteTitle,
  siteUrl
} from "@/lib/seo";

const frameImageUrl = `${siteOrigin}/images/pappardelle-faucet-banner.png`;
const miniAppName = "PAPPARDELLE Faucet";

const accountAssociation =
  process.env.FARCASTER_ACCOUNT_ASSOCIATION_HEADER &&
  process.env.FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD &&
  process.env.FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE
    ? {
        header: process.env.FARCASTER_ACCOUNT_ASSOCIATION_HEADER,
        payload: process.env.FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD,
        signature: process.env.FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE
      }
    : undefined;

export const farcasterFrame = {
  version: "1",
  name: miniAppName,
  iconUrl: siteLogoAbsolute,
  homeUrl: siteUrl,
  imageUrl: frameImageUrl,
  buttonTitle: "Claim PAPPARDELLE",
  splashImageUrl: siteLogoAbsolute,
  splashBackgroundColor: "#4d130f",
  webhookUrl: `${siteOrigin}/api/farcaster/webhook`,
  subtitle: "Crypto meatballs on Base",
  description: siteDescription,
  primaryCategory: "finance",
  tags: ["base", "celo", "faucet", "pappardelle"]
};

export const farcasterManifest = {
  ...(accountAssociation ? { accountAssociation } : {}),
  frame: farcasterFrame
};

export const farcasterMiniAppEmbed = {
  version: "1",
  imageUrl: frameImageUrl,
  button: {
    title: "Open PAPPARDELLE",
    action: {
      type: "launch_frame",
      name: miniAppName,
      url: siteUrl,
      splashImageUrl: siteLogoAbsolute,
      splashBackgroundColor: "#4d130f"
    }
  }
};

export const farcasterAppJsonLd = {
  "@type": "SoftwareApplication",
  name: siteTitle,
  applicationCategory: "Farcaster Mini App",
  operatingSystem: "Farcaster clients, MiniPay, wallet-enabled browsers",
  url: siteUrl,
  image: frameImageUrl,
  publisher: {
    "@type": "Person",
    name: "pappardelle.eth"
  }
};
