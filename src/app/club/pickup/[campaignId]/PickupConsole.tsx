"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { confirmPickupAction, searchPickupAction } from "@/app/club/actions";
import type { PickupCandidate } from "@/lib/data/pickup";

type Stage = "search" | "detail" | "done" | "already";

export function PickupConsole({ campaignId }: { campaignId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickupCandidate[]>([]);
  const [selected, setSelected] = useState<PickupCandidate | null>(null);
  const [stage, setStage] = useState<Stage>("search");
  const [message, setMessage] = useState<string | null>(null);
  const [pickedUpAt, setPickedUpAt] = useState<string | null>(null);
  const [confirmedBy, setConfirmedBy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function runSearch(value: string) {
    setMessage(null);
    startTransition(async () => {
      const response = await searchPickupAction(campaignId, value);
      setResults(response.candidates);
      if (!response.candidates.length) setMessage("Ingen treff. Prøv navn eller hentekode.");
      if (response.candidates.length === 1) select(response.candidates[0]);
    });
  }

  function select(candidate: PickupCandidate) {
    setSelected(candidate);
    setPickedUpAt(candidate.pickedUpAt);
    setConfirmedBy(candidate.confirmedByName);
    setStage(candidate.status === "PICKED_UP" ? "already" : "detail");
    setConfirming(false);
    setMessage(null);
  }

  function reset() {
    setQuery("");
    setResults([]);
    setSelected(null);
    setStage("search");
    setMessage(null);
    setPickedUpAt(null);
    setConfirming(false);
  }

  function confirm() {
    if (!selected) return;
    startTransition(async () => {
      const response = await confirmPickupAction(campaignId, selected.sellerId, selected.expectedQuantity);
      if (response.ok) {
        setPickedUpAt(response.pickedUpAt);
        setConfirmedBy(response.confirmedBy);
        setStage("done");
      } else if (response.code === "ALREADY_PICKED_UP") {
        setPickedUpAt(response.pickedUpAt);
        setStage("already");
      } else {
        setMessage(response.message);
      }
    });
  }

  if (stage === "already" && selected) {
    return (
      <Card className="mt-8 border-amber-300 bg-amber-50 px-6 py-10 text-center">
        <p className="display text-3xl text-amber-900">ALLEREDE HENTET</p>
        <p className="mt-4 text-xl font-medium text-amber-900">{selected.name}</p>
        {pickedUpAt ? (
          <p className="display mt-4 text-2xl text-amber-900">
            {new Date(pickedUpAt).toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" })}
            <br />
            {new Date(pickedUpAt).toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
          </p>
        ) : null}
        {confirmedBy ? <p className="mt-3 text-sm text-amber-800">Bekreftet av {confirmedBy}</p> : null}
        <Button className="mt-8 w-full" size="lg" variant="secondary" onClick={reset}>
          Neste selger
        </Button>
      </Card>
    );
  }

  if (stage === "done" && selected) {
    return (
      <Card className="mt-8 border-emerald-300 bg-emerald-50 px-6 py-10 text-center">
        <p className="display text-4xl text-emerald-900">HENTET ✓</p>
        <p className="mt-4 text-xl font-medium text-emerald-900">{selected.name}</p>
        <p className="tabular mt-2 text-emerald-800">{selected.expectedQuantity} produkter utlevert</p>
        {pickedUpAt ? (
          <p className="mt-4 text-sm text-emerald-800">{new Date(pickedUpAt).toLocaleString("nb-NO")}</p>
        ) : null}
        {confirmedBy ? <p className="text-sm text-emerald-800">Bekreftet av {confirmedBy}</p> : null}
        <Button className="mt-8 w-full" size="lg" onClick={reset}>
          Neste selger
        </Button>
      </Card>
    );
  }

  if (stage === "detail" && selected) {
    return (
      <Card className="mt-8">
        <div className="border-b border-navy-100 px-6 py-6">
          <p className="display text-3xl uppercase">{selected.name}</p>
          <p className="mt-1 text-navy-400">
            {selected.clubName} – {selected.teamName} · Kode {selected.pickupCode}
          </p>
        </div>

        <div className="border-b border-navy-100 px-6 py-6">
          <p className="label">Produkter som skal hentes</p>
          <p className="display tabular mt-2 text-6xl">{selected.expectedQuantity}</p>
        </div>

        <ul className="divide-y divide-navy-100">
          {selected.orders.map((order, index) => (
            <li key={`${order.customerName}-${index}`} className="flex items-center justify-between px-6 py-3 text-lg">
              <span className="text-navy-700">{order.customerName}</span>
              <span className="tabular font-medium">{order.quantity}</span>
            </li>
          ))}
          {!selected.orders.length ? (
            <li className="px-6 py-4 text-sm text-navy-400">Ingen betalte ordrer registrert.</li>
          ) : null}
        </ul>

        <div className="flex items-center justify-between border-t border-navy-100 px-6 py-4 text-lg font-semibold">
          <span>TOTALT</span>
          <span className="tabular">{selected.expectedQuantity}</span>
        </div>

        {message ? <p className="px-6 pb-2 text-sm text-red-700">{message}</p> : null}

        <div className="space-y-3 px-6 pb-6">
          {confirming ? (
            <>
              <p className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Bekreft at {selected.expectedQuantity} produkter faktisk er levert ut til {selected.name}.
              </p>
              <Button size="lg" className="w-full" disabled={pending} onClick={confirm}>
                {pending ? "Lagrer…" : `Ja, ${selected.expectedQuantity} produkter er utlevert`}
              </Button>
              <Button size="lg" variant="secondary" className="w-full" onClick={() => setConfirming(false)}>
                Avbryt
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                className="w-full py-6 text-lg"
                disabled={selected.expectedQuantity === 0}
                onClick={() => setConfirming(true)}
              >
                BEKREFT {selected.expectedQuantity} PRODUKTER UTLEVERT
              </Button>
              <Button size="lg" variant="secondary" className="w-full" onClick={reset}>
                Tilbake til søk
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="mt-8">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          runSearch(query);
        }}
      >
        <label className="label" htmlFor="pickup-search">
          Søk etter selger eller hentekode
        </label>
        <input
          id="pickup-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Johannes eller ABC123"
          autoComplete="off"
          className="field mt-2 py-4 text-lg"
        />
        <Button type="submit" size="lg" className="mt-3 w-full py-5 text-lg" disabled={pending || query.trim().length < 2}>
          {pending ? "Søker…" : "Søk"}
        </Button>
      </form>

      <QrScanner
        onResult={(value) => {
          setQuery(value);
          runSearch(value);
        }}
      />

      {message ? <p className="mt-4 text-sm text-navy-500">{message}</p> : null}

      {results.length > 1 ? (
        <ul className="mt-6 space-y-2">
          {results.map((candidate) => (
            <li key={candidate.sellerId}>
              <button
                type="button"
                onClick={() => select(candidate)}
                className="flex w-full items-center justify-between rounded-sm border border-navy-200 bg-white px-5 py-4 text-left transition hover:border-navy-900"
              >
                <span>
                  <span className="block text-lg font-medium text-navy-900">{candidate.name}</span>
                  <span className="text-sm text-navy-400">
                    {candidate.teamName} · {candidate.pickupCode}
                  </span>
                </span>
                <span className="tabular text-2xl font-semibold">{candidate.expectedQuantity}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** QR scanning via the browser's BarcodeDetector, when the device supports it. */
function QrScanner({ onResult }: { onResult: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [supported, setSupported] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window && Boolean(navigator.mediaDevices));
  }, []);

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    (async () => {
      try {
        const DetectorCtor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
        const detector = new DetectorCtor({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length && codes[0].rawValue) {
              setScanning(false);
              onResult(codes[0].rawValue.split("/").pop() ?? codes[0].rawValue);
              return;
            }
          } catch {
            // transient decode failure — keep scanning
          }
          raf = requestAnimationFrame(() => void tick());
        };
        void tick();
      } catch {
        setError("Fikk ikke tilgang til kameraet.");
        setScanning(false);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [scanning, onResult]);

  if (!supported) return null;

  return (
    <div className="mt-4">
      <Button type="button" variant="secondary" size="lg" className="w-full" onClick={() => setScanning((v) => !v)}>
        {scanning ? "Stopp skanning" : "Skann QR-kode"}
      </Button>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {scanning ? (
        <video ref={videoRef} className="mt-3 w-full rounded-sm border border-navy-200" muted playsInline />
      ) : null}
    </div>
  );
}
