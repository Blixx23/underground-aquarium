"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "@/lib/images/prepareImage";

export type StorePhoto = { id: string; url: string; caption: string | null };

const MAX = 8;

/** The shop's own photos: storefront, tanks, livestock. */
export default function StorePhotos({
  storeId,
  userId,
  initial,
  isOwner,
  heading = true,
}: {
  storeId: string;
  userId: string | null;
  initial: StorePhoto[];
  isOwner: boolean;
  /** The dashboard supplies its own title. */
  heading?: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files || !userId) return;
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files).slice(0, MAX - photos.length)) {
        const ready = await prepareImage(file);
        const path = `${userId}/${storeId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.jpg`;
        const { error: upErr } = await supabase.storage.from("store-photos").upload(path, ready);
        if (upErr) throw new Error(upErr.message);
        const url = supabase.storage.from("store-photos").getPublicUrl(path).data.publicUrl;
        const { data, error: insErr } = await supabase
          .from("store_photos")
          .insert({ store_id: storeId, url })
          .select("id, url, caption")
          .single();
        if (insErr) throw new Error(insErr.message);
        setPhotos((p) => [...p, data as StorePhoto]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that photo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: string) {
    setPhotos((p) => p.filter((x) => x.id !== id));
    await supabase.from("store_photos").delete().eq("id", id);
  }

  if (!isOwner && photos.length === 0) return null;

  return (
    <section className={heading ? "mt-10" : ""}>
      {heading && <h2 className="mb-3 font-display text-xl text-white">Photos</h2>}

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((p) => (
            <div key={p.id} className="relative overflow-hidden rounded-xl border border-white/10">
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.caption ?? ""} loading="lazy" className="aspect-square w-full object-cover" />
              </a>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label="Remove photo"
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && photos.length < MAX && (
        <>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-ocean-200 transition-colors hover:bg-white/5 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Add photos
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => upload(e.target.files)}
          />
        </>
      )}
      {error && <p className="mt-2 text-sm text-coral-300">{error}</p>}
    </section>
  );
}
