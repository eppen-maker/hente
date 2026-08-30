import type { Metadata, Viewport } from "next";
import { Inter, Instrument_Serif } from "next/font/google";

import "./globals.css";

const body = Inter({
  subsets: ["latin", "latin-ext"],
  variable: "--font-body",
  display: "swap",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://sor.no"),
  title: {
    default: "SØR° — En dugnad folk faktisk vil kjøpe",
    template: "%s — SØR°",
  },
  description:
    "Premium hverdagsprodukter til dugnad. Klubben kjøper inn til fast pris og beholder fortjenesten fra hvert produkt. Beregn hva laget kan tjene.",
  openGraph: {
    type: "website",
    locale: "nb_NO",
    siteName: "SØR°",
    title: "SØR° — En dugnad folk faktisk vil kjøpe",
    description:
      "Premium hverdagsprodukter. Enkel dugnad. Mer igjen til klubben.",
  },
};

export const viewport: Viewport = {
  themeColor: "#faf8f4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="nb" className={`${body.variable} ${display.variable}`}>
      <head>
        <noscript>
          {/* Entrance animations are progressive enhancement only. */}
          <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
      </head>
      <body className="flex min-h-dvh flex-col antialiased">{children}</body>
    </html>
  );
}
