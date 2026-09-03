"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

/** Copy / download / print helpers for a seller's personal sales link. */
export function ShareLink({ url, label = "Din salgslenke" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const qrSrc = `/api/qr?data=${encodeURIComponent(url)}&size=512`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function print() {
    const win = window.open("", "_blank", "width=640,height=800");
    if (!win) return;
    win.document.write(
      `<!doctype html><title>QR</title><body style="font-family:system-ui;text-align:center;padding:48px">` +
        `<img src="${qrSrc}" width="360" height="360" alt="QR" />` +
        `<p style="margin-top:24px;font-size:14px;word-break:break-all">${url}</p>` +
        `</body>`,
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  return (
    <div className="card px-5 py-5">
      <p className="label">{label}</p>
      <div className="mt-4 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
        <img src={qrSrc} alt="QR-kode til salgssiden" width={132} height={132} className="rounded-sm border border-navy-100" />
        <div className="min-w-0 flex-1">
          <p className="break-all text-sm text-navy-500">{url}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={copy}>
              {copied ? "Kopiert ✓" : "Kopier lenke"}
            </Button>
            <a
              href={qrSrc}
              download="sorkyst-qr.svg"
              className="inline-flex items-center rounded-sm border border-navy-200 bg-white px-3 py-1.5 text-sm text-navy-900 transition hover:border-navy-900"
            >
              Last ned QR
            </a>
            <Button type="button" size="sm" variant="secondary" onClick={print}>
              Skriv ut
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
