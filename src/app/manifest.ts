import type { MetadataRoute } from "next";
import { brand } from "@/brand/brand.config";

/**
 * Web app manifest — makes SØRKYST installable on a phone's home screen.
 * Sellers and clubhouse volunteers get an app icon and a full-screen window
 * without an app store, and customers still only ever open a link.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} dugnad`,
    short_name: brand.name,
    description: brand.product.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAF9F6",
    theme_color: "#0F1B2D",
    lang: "nb-NO",
    categories: ["business", "shopping"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
