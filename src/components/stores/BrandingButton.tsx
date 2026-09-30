"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage, isImageFile } from "@/lib/images/prepareImage";

type Kind = "cover" | "logo";

/**
 * Upload or remove the shop's banner (cover) or logo. The photo goes to our
 * storage first, then the server checks you run the shop before saving it.
 *
 * variant "overlay": a small camera button that sits on the banner or logo.
 * variant "panel": a labeled button pair for the dashboard.
 */
export default function BrandingButton({
  storeId,
  userId,
  kind,
  hasImage,
  variant = "overlay",
  className = "",
}: {
  storeId: string;
  userId: string;
  kind: Kind;
  hasImage: boolean;
  variant?: "overlay" | "panel";
  className?: string;
}) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const noun = kind === "cover" ? "banner" : "logo";

  async function save(url: string | null) {
    const res = await fetch("/api/stores/branding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId, kind, url }),
    });
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(j?.error || `Couldn't save your ${noun}.`);
    }
  }

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!isImageFile(file)) {
      setError("Please choose a photo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const ready = await prepareImage(file);
      const path = `${userId}/${storeId}-${kind}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("store-photos")
        .upload(path, ready, { contentType: "image/jpeg" });
      if (upErr) throw new Error(`That ${noun} didn't upload. Please try again.`);
      const url = supabase.storage.from("store-photos").getPublicUrl(path).data.publicUrl;
      await save(url);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Couldn't save your ${noun}.`);
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove() {
    if (!confirm(`Remove your ${noun}? The page goes back to the standard one.`)) return;
    setBusy(true);
    setError(null);
    try {
      await save(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Couldn't remove your ${noun}.`);
    } finally {
      setBusy(false);
    }
  }

  const input = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*,.heic,.heif"
      className="hidden"
      onChange={(e) => upload(e.target.files?.[0])}
    />
  );

  if (variant === "overlay") {
    return (
      <>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          aria-label={hasImage ? `Change ${noun}` : `Add a ${noun}`}
          title={hasImage ? `Change ${noun}` : `Add a ${noun}`}
          className={`inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-ocean-950/80 px-3 py-1.5 text-xs font-medium text-white shadow-lg backdrop-blur transition-colors hover:bg-ocean-900 disabled:opacity-60 ${className}`}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
          {kind === "cover" && <span>{hasImage ? "Change banner" : "Add a banner"}</span>}
        </button>
        {input}
        {error && (
          <span className="absolute left-0 top-full mt-1 whitespace-nowrap rounded bg-coral-500/90 px-2 py-1 text-xs text-white">
            {error}
          </span>
        )}
      </>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {hasImage ? `Change ${noun}` : `Upload a ${noun}`}
        </button>
        {hasImage && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-sm text-ocean-300 transition-colors hover:text-coral-300 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        )}
      </div>
      {input}
      {error && <p className="mt-2 text-sm text-coral-300">{error}</p>}
    </div>
  );
}
