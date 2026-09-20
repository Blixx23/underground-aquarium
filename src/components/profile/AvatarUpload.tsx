"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/profile/Avatar";

const BUCKET = "avatars";
const SIZE = 512;

/** Shrink and square-crop a photo in the browser so avatars stay small and fast. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - side) / 2;
    const sy = (img.naturalHeight - side) / 2;
    const out = Math.min(SIZE, side);
    const canvas = document.createElement("canvas");
    canvas.width = out;
    canvas.height = out;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, sx, sy, side, side, 0, 0, out, out);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.88)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Profile photo picker for the dashboard. The file goes to
 * avatars/<user id>/..., and set_my_avatar() only accepts a URL from
 * that folder, so nobody can point their avatar at someone else's image.
 */
export default function AvatarUpload({
  userId,
  name,
  initialUrl,
  society = false,
}: {
  userId: string;
  name: string;
  initialUrl: string | null;
  society?: boolean;
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const input = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      let blob: Blob;
      try {
        blob = await toSquareJpeg(file);
      } catch {
        throw new Error("Couldn't read that photo. Try a JPG or PNG.");
      }
      const path = `${userId}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw new Error(upErr.message);
      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const { error: rpcErr } = await supabase.rpc("set_my_avatar", { p_url: publicUrl });
      if (rpcErr) throw new Error(rpcErr.message);
      setUrl(publicUrl);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setError(null);
    setBusy(true);
    const { error: rpcErr } = await supabase.rpc("set_my_avatar", { p_url: null });
    setBusy(false);
    if (rpcErr) {
      setError(rpcErr.message);
      return;
    }
    setUrl(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy}
        className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        aria-label="Change profile photo"
      >
        <Avatar name={name} src={url} society={society} size={72} />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 opacity-0 transition-opacity group-hover:opacity-100">
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      <div className="flex items-center gap-2 text-[11px]">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="text-ocean-400 hover:text-white"
        >
          {url ? "Change" : "Add photo"}
        </button>
        {url && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-ocean-600 hover:text-coral-300"
            aria-label="Remove profile photo"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
      {error && <p className="max-w-[10rem] text-center text-[11px] text-coral-300">{error}</p>}
    </div>
  );
}
