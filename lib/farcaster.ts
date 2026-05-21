import {
  siteDescription,
  siteLogoAbsolute,
  siteName,
  siteOgImageAbsolute,
  siteOrigin,
  siteTitle,
  siteUrl
} from "@/lib/seo";

const frameImageUrl = `${siteOrigin}/images/pappardelle-faucet-banner.png`;
const miniAppName = "PAPPARDELLE Faucet";
const miniAppTagline = "Claim crypto meatballs on Base";
const miniAppOgDescription =
  "Claim PAPPARDELLE once per wallet on Base. Earn referral points and buy monthly passes with crypto meatballs from pappardelle.eth.";
const miniAppScreenshotUrls = [
  `${siteOrigin}/images/farcaster-screenshot-claim.jpg`,
  `${siteOrigin}/images/farcaster-screenshot-zora.jpg`,
  `${siteOrigin}/images/farcaster-screenshot-pass.jpg`
];

const defaultAccountAssociation = {
  header:
    "eyJmaWQiOjQ2ODk3OSwidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweGFjMDIwNzhFZWQxMjBGMjMyMUE4ODgzRjE1Q0FjRUI3N2JhQzVjRTAifQ",
  payload: "eyJkb21haW4iOiJwYXBwYXJkZWxsZWZhdWNldC52ZXJjZWwuYXBwIn0",
  signature:
    "IYjwMdgxc+SlELyg/4G3zdH7MC8xEsZSses3uDZgTugJpJ28NG2XUXdsmJ3veJDvzOYdJ/uGV+4lwbuYYA89LBs="
};

const accountAssociation = {
  header: process.env.FARCASTER_ACCOUNT_ASSOCIATION_HEADER || defaultAccountAssociation.header,
  payload: process.env.FARCASTER_ACCOUNT_ASSOCIATION_PAYLOAD || defaultAccountAssociation.payload,
  signature:
    process.env.FARCASTER_ACCOUNT_ASSOCIATION_SIGNATURE || defaultAccountAssociation.signature
};

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
  screenshotUrls: miniAppScreenshotUrls,
  primaryCategory: "finance",
  tags: ["base", "celo", "faucet", "pappardelle"],
  heroImageUrl: siteOgImageAbsolute,
  tagline: miniAppTagline,
  ogTitle: "PAPPARDELLE Faucet on Base",
  ogDescription: miniAppOgDescription,
  ogImageUrl: siteOgImageAbsolute,
  castShareUrl: siteUrl
};

export const farcasterManifest = {
  ...(accountAssociation ? { accountAssociation } : {}),
  miniapp: farcasterFrame,
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
