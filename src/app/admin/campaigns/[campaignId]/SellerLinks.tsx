"use client";

import { useMemo, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { setSellerTargetAction } from "@/app/admin/actions";

export interface SellerLinkRow {
  id: string;
  name: string;
  teamName: string;
  sellerCode: string;
  salesTarget: number;
  sold: number;
  url: string;
}

export function SellerLinks({ sellers, campaignId }: { sellers: SellerLinkRow[]; campaignId: string }) {
  const [query, setQuery] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sellers;
    return sellers.filter((s) => s.name.toLowerCase().includes(q) || s.teamName.toLowerCase().includes(q));
  }, [sellers, query]);

  function printAll() {
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return;
    const cards = filtered
      .map(
        (s) =>
          `<div style="page-break-inside:avoid;display:inline-block;width:46%;margin:2%;text-align:center;font-family:system-ui">
             <img src="/api/qr?data=${encodeURIComponent(s.url)}&size=320" width="200" height="200" alt="QR" />
             <p style="margin:8px 0 0;font-weight:600">${s.name}</p>
             <p style="margin:2px 0;font-size:12px;color:#555">${s.teamName} · ${s.sellerCode}</p>
             <p style="margin:2px 0;font-size:10px;color:#888;word-break:break-all">${s.url}</p>
           </div>`,
      )
      .join("");
    win.document.write(`<!doctype html><title>SØRKYST QR</title><body>${cards}</body>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-navy-100 px-5 py-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Søk selger eller lag…"
          className="w-full rounded-sm border border-navy-200 px-2.5 py-1.5 text-sm outline-none focus:border-navy-900 sm:w-56"
        />
        <Button size="sm" variant="secondary" className="ml-auto" onClick={printAll} disabled={!filtered.length}>
          Skriv ut alle QR-koder
        </Button>
      </div>

      <ul className="divide-y divide-navy-100">
        {filtered.map((seller) => (
          <li key={seller.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
            <img
              src={`/api/qr?data=${encodeURIComponent(seller.url)}&size=192`}
              alt=""
              width={56}
              height={56}
              className="rounded-sm border border-navy-100"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-navy-900">
                {seller.name} <span className="ml-1 text-xs text-navy-300">{seller.sellerCode}</span>
              </p>
              <p className="text-sm text-navy-400">{seller.teamName}</p>
              <p className="mt-1 break-all text-xs text-navy-300">{seller.url}</p>
            </div>

            <div className="tabular text-right text-sm">
              <p className="font-medium">{seller.sold} solgt</p>
              <label className="mt-1 flex items-center justify-end gap-1.5 text-xs text-navy-400">
                Mål
                <input
                  type="number"
                  min={0}
                  defaultValue={seller.salesTarget}
                  disabled={pending}
                  onBlur={(event) => {
                    const value = Number(event.target.value);
                    if (value === seller.salesTarget) return;
                    startTransition(async () => void (await setSellerTargetAction(seller.id, value, campaignId)));
                  }}
                  className="w-16 rounded-sm border border-navy-200 px-1.5 py-1 text-right"
                />
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(seller.url);
                  setCopiedId(seller.id);
                  setTimeout(() => setCopiedId(null), 1500);
                }}
              >
                {copiedId === seller.id ? "Kopiert ✓" : "Kopier"}
              </Button>
              <a
                href={`/api/qr?data=${encodeURIComponent(seller.url)}&size=512`}
                download={`qr-${seller.sellerCode}.svg`}
                className="inline-flex items-center rounded-sm border border-navy-200 bg-white px-3 py-1.5 text-sm text-navy-900 transition hover:border-navy-900"
              >
                QR
              </a>
            </div>
          </li>
        ))}
        {!filtered.length ? <li className="px-5 py-10 text-center text-sm text-navy-400">Ingen selgere ennå.</li> : null}
      </ul>
    </div>
  );
}
