import type { MetadataRoute } from "next";
import { siteDescription, siteLogo, siteName, siteUrl } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteName,
    short_name: "PAPPARDELLE",
    description: siteDescription,
    start_url: siteUrl,
    scope: siteUrl,
    display: "standalone",
    background_color: "#4d130f",
    theme_color: "#a1271d",
    icons: [
      {
        src: siteLogo,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    categories: ["finance", "utilities"]
  };
}
