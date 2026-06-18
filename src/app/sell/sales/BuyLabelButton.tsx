"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Truck, Loader2, Tag } from "lucide-react";

type Quote = {
  priceCents: number;
  carrierName: string;
  service: string;
};

type LabelFormat = "PDF_4x6" | "PDF";

export default function BuyLabelButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingRate, setLoadingRate] = useState(false);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);

  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [format, setFormat] = useState<LabelFormat>("PDF_4x6");

  // Changing any dimension invalidates a previously fetched price.
  function onDimChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value);
      setQuote(null);
    };
  }

  function dimsFilled() {
    return [weight, length, width, height].every((v) => v.trim() !== "");
  }

  function parcelBody() {
    return {
      orderId,
      weightOz: parseFloat(weight),
      lengthIn: parseFloat(length),
      widthIn: parseFloat(width),
      heightIn: parseFloat(height),
      labelFormat: format,
    };
  }

  async function getRate() {
    setError(null);
    if (!dimsFilled()) {
      setError("Fill in weight and all three box dimensions.");
      return;
    }
    setLoadingRate(true);
    try {
      const res = await fetch("/api/orders/label-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parcelBody()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't get a rate.");
      setQuote({
        priceCents: data.priceCents,
        carrierName: data.carrierName,
        service: data.service,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoadingRate(false);
    }
  }

  async function buyLabel() {
    setError(null);
    setBuying(true);
    try {
      const res = await fetch("/api/orders/buy-label", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parcelBody()),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't buy the label.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBuying(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-3">
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-full bg-ocean-500/15 px-4 py-1.5 text-xs font-medium text-ocean-200 border border-ocean-500/30 hover:bg-ocean-500/25 transition-colors"
        >
          <Truck className="w-3.5 h-3.5" /> Buy shipping label
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-2.5 py-1.5 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";
  const price = quote ? quote.priceCents : 0;

  const fmtBtn = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium transition-colors ${
      active
        ? "bg-ocean-500/25 text-ocean-100"
        : "text-ocean-400 hover:text-ocean-200"
    }`;

  return (
    <div className="w-full mt-3 rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-4">
      <p className="text-xs text-ocean-400 mb-3">
        Package details — we&apos;ll find the cheapest label, then show the price
        before you buy.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <div>
          <label className="block text-[11px] text-ocean-500 mb-1">Weight (oz)</label>
          <input type="number" min="0" step="0.1" value={weight} onChange={onDimChange(setWeight)} placeholder="8" className={inputClass} />
        </div>
        <div>
          <label className="block text-[11px] text-ocean-500 mb-1">Length (in)</label>
          <input type="number" min="0" step="0.1" value={length} onChange={onDimChange(setLength)} placeholder="10" className={inputClass} />
        </div>
        <div>
          <label className="block text-[11px] text-ocean-500 mb-1">Width (in)</label>
          <input type="number" min="0" step="0.1" value={width} onChange={onDimChange(setWidth)} placeholder="6" className={inputClass} />
        </div>
        <div>
          <label className="block text-[11px] text-ocean-500 mb-1">Height (in)</label>
          <input type="number" min="0" step="0.1" value={height} onChange={onDimChange(setHeight)} placeholder="4" className={inputClass} />
        </div>
      </div>

      <div className="mb-3">
        <span className="block text-[11px] text-ocean-500 mb-1.5">Label format</span>
        <div className="inline-flex rounded-lg border border-ocean-800/60 overflow-hidden">
          <button
            type="button"
            onClick={() => setFormat("PDF_4x6")}
            className={fmtBtn(format === "PDF_4x6")}
          >
            4×6 label
          </button>
          <button
            type="button"
            onClick={() => setFormat("PDF")}
            className={`border-l border-ocean-800/60 ${fmtBtn(format === "PDF")}`}
          >
            8.5×11 sheet
          </button>
        </div>
        <p className="text-[11px] text-ocean-600 mt-1">
          {format === "PDF_4x6"
            ? "Best for label printers, or print-to-fit on paper."
            : "Standard printer paper — cut out the label."}
        </p>
      </div>

      {error && <p className="text-[11px] text-red-300 mb-2">{error}</p>}

      {quote && (
        <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-sm">
          <div className="flex items-center justify-between gap-2 text-emerald-200">
            <span className="flex items-center gap-2 font-medium">
              <Tag className="w-3.5 h-3.5" />
              {quote.carrierName} {quote.service}
            </span>
            <span className="text-white font-medium">
              ${(price / 100).toFixed(2)}
            </span>
          </div>
          <p className="text-ocean-400 mt-1 text-xs">
            Comes out of your payout for this order.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        {!quote ? (
          <button
            onClick={getRate}
            disabled={loadingRate}
            className="inline-flex items-center gap-2 rounded-full bg-ocean-500/20 px-4 py-1.5 text-xs font-medium text-ocean-100 border border-ocean-500/30 hover:bg-ocean-500/30 transition-colors disabled:opacity-60"
          >
            {loadingRate ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Tag className="w-3.5 h-3.5" />
            )}
            {loadingRate ? "Checking…" : "Get shipping rate"}
          </button>
        ) : (
          <button
            onClick={buyLabel}
            disabled={buying}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-4 py-1.5 text-xs font-medium text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-60"
          >
            {buying ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Truck className="w-3.5 h-3.5" />
            )}
            {buying ? "Buying…" : `Buy label · $${(price / 100).toFixed(2)}`}
          </button>
        )}
        <button
          onClick={() => {
            setOpen(false);
            setQuote(null);
            setError(null);
          }}
          disabled={loadingRate || buying}
          className="text-xs text-ocean-400 hover:text-ocean-200 disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
