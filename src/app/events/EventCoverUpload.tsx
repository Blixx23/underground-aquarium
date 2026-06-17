"use client";

import { useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function EventCoverUpload({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [supabase] = useState(() => createClient());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      let file = selected;
      const isHeic =
        /image\/hei[cf]/i.test(selected.type) ||
        /\.(heic|heif)$/i.test(selected.name);
      if (isHeic) {
        const heic2any = (await import("heic2any")).default;
        const result = await heic2any({
          blob: selected,
          toType: "image/jpeg",
          quality: 0.9,
        });
        const blob = Array.isArray(result) ? result[0] : result;
        file = new File(
          [blob],
          selected.name.replace(/\.(heic|heif)$/i, ".jpg"),
          { type: "image/jpeg" }
        );
      }

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        setError("Please sign in again.");
        setBusy(false);
        return;
      }

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const filePath = `${uid}/event-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);
      onChange(pub.publicUrl);
    } catch {
      setError("Couldn't upload that image. Try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <label className="block cursor-pointer rounded-xl border border-dashed border-white/15 bg-white/5 hover:border-emerald-500/40 transition-colors overflow-hidden">
        {busy ? (
          <div className="h-44 flex flex-col items-center justify-center text-ocean-400">
            <Loader2 className="w-7 h-7 mb-2 animate-spin" />
            <span className="text-sm">Uploading…</span>
          </div>
        ) : value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="Cover preview"
            className="w-full h-44 object-cover"
          />
        ) : (
          <div className="h-44 flex flex-col items-center justify-center text-ocean-500">
            <ImagePlus className="w-7 h-7 mb-2" />
            <span className="text-sm">Click to upload a cover image</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*,.heic,.heif"
          onChange={handleFile}
          className="hidden"
        />
      </label>
      {value && !busy && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 inline-flex items-center gap-1 text-xs text-ocean-400 hover:text-red-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Remove image
        </button>
      )}
      {error && <p className="text-xs text-red-300 mt-2">{error}</p>}
    </div>
  );
}