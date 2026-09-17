import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { readStore } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hente Invest — Investment Intelligence",
  description: "Internal investment intelligence system: companies, analysis, allocation and scenarios.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const store = readStore();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem('hente-theme')||'light'}catch(e){}`,
          }}
        />
      </head>
      <body>
        <div className="flex min-h-screen">
          <Nav fundName={store.meta.fundName} vehicleName={store.vehicle.name} />
          <main className="flex-1 min-w-0">
            <div className="max-w-[1480px] mx-auto px-9 py-9">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
