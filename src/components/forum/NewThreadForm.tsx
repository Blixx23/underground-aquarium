"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, PenLine, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // input cap; resized/compressed below
const MAX_DIM = 1920; // longest edge after resize

// Resize + compress in the browser before upload (mirrors the tank pipeline).
async function compressImage(file: File): Promise<Blob> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("decode failed"));
    im.src = dataUrl;
  });

  let { width, height } = img;
  if (width > MAX_DIM || height > MAX_DIM) {
    const scale = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");
  ctx.drawImage(img, 0, 0, width, height);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.82)
  );
  if (!blob) throw new Error("encode failed");
  return blob;
}

export default function NewThreadForm({ category }: { category: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file later
    if (files.length === 0) return;
    setPhotoMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUploading(true);
    let count = images.length;
    try {
      for (const file of files) {
        if (count >= MAX_PHOTOS) {
          setPhotoMsg(`Up to ${MAX_PHOTOS} photos per post.`);
          break;
        }
        if (!file.type.startsWith("image/")) {
          setPhotoMsg("Images only, please.");
          continue;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          setPhotoMsg("That photo is too large (max 10 MB).");
          continue;
        }

        let blob: Blob = file;
        let ext = "jpg";
        let contentType = "image/jpeg";
        try {
          blob = await compressImage(file);
        } catch {
          blob = file;
          ext = (file.name.split(".").pop() || "jpg").toLowerCase();
          contentType = file.type || "image/jpeg";
        }

        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("forum-images")
          .upload(path, blob, { contentType });
        if (upErr) {
          setPhotoMsg("A photo failed to upload — try again.");
          continue;
        }
        const { data } = supabase.storage
          .from("forum-images")
          .getPublicUrl(path);
        setImages((prev) => [...prev, data.publicUrl]);
        count++;
      }
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(url: string) {
    setImages((prev) => prev.filter((u) => u !== url));
    // Best-effort cleanup of the stored file.
    const marker = "/forum-images/";
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const path = url.slice(idx + marker.length);
      try {
        await supabase.storage.from("forum-images").remove([path]);
      } catch {
        // ignore — orphaned file is harmless
      }
    }
  }

  async function submit() {
    if (title.trim().length < 3) {
      setError("Give your post a title (at least 3 characters).");
      return;
    }
    if (!body.trim() && images.length === 0) {
      setError("Write something, or add a photo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/forum/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title: title.trim(),
          body: body.trim(),
          images,
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't post.");
      router.push(`/forums/${category}/${data.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post.");
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";

  return (
    <div>
      {error && (
        <p className="text-sm text-coral-300 mb-4 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {error}
        </p>
      )}

      <label className="block text-xs text-ocean-400 mb-1">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's your question or topic?"
        maxLength={160}
        className={`${inputClass} mb-4`}
      />

      <label className="block text-xs text-ocean-400 mb-1">Body</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share the details. Markdown supported."
        rows={10}
        className={`${inputClass} resize-y`}
      />

      {/* Photos */}
      <label className="block text-xs text-ocean-400 mb-2 mt-4">
        Photos <span className="text-ocean-600">(optional, up to {MAX_PHOTOS})</span>
      </label>
      <div className="flex flex-wrap gap-3">
        {images.map((url) => (
          <div
            key={url}
            className="relative w-24 h-24 rounded-xl overflow-hidden border border-ocean-800/60"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Upload" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeImage(url)}
              aria-label="Remove photo"
              className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {images.length < MAX_PHOTOS && (
          <label className="w-24 h-24 rounded-xl border border-dashed border-ocean-700/70 bg-ocean-900/40 flex flex-col items-center justify-center gap-1 cursor-pointer text-ocean-500 hover:text-ocean-300 hover:border-ocean-600 transition-colors">
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <ImagePlus className="w-5 h-5" />
                <span className="text-[11px]">Add</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              disabled={uploading}
              className="hidden"
            />
          </label>
        )}
      </div>
      {photoMsg && <p className="text-xs text-amber-300/80 mt-2">{photoMsg}</p>}

      <div className="flex items-center gap-3 mt-6">
        <button
          type="button"
          onClick={submit}
          disabled={busy || uploading}
          className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PenLine className="w-4 h-4" />
          )}
          Post
        </button>
        <Link
          href={`/forums/${category}`}
          className="text-sm text-ocean-500 hover:text-ocean-300 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
