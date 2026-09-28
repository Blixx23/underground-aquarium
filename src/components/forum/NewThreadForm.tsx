"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, PenLine, ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { goToLogin, takeDraft } from "@/lib/loginRedirect";
import { isImageFile, prepareImage, uploadExtension } from "@/lib/images/prepareImage";
import {
  MAX_OPENER,
  MAX_TITLE,
  MIN_TITLE,
  tooLongMessage,
} from "@/lib/forum/limits";
import CharCounter from "@/components/forum/CharCounter";

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // checked before converting and shrinking

export default function NewThreadForm({
  category: initialCategory = "",
  choices,
}: {
  category?: string;
  /** When given, the poster picks the section here instead of arriving from one. */
  choices?: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const [category, setCategory] = useState(initialCategory);
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);

  // Back from signing in: put what they'd written back in the form.
  useEffect(() => {
    const saved = takeDraft<{ title: string; body: string }>("new-thread");
    if (saved) {
      setTitle(saved.title ?? "");
      setBody(saved.body ?? "");
    }
  }, []);
  const toLogin = () => goToLogin({ key: "new-thread", value: { title, body } });

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file later
    if (files.length === 0) return;
    setPhotoMsg(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toLogin();
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
        if (!isImageFile(file)) {
          setPhotoMsg("Images only, please.");
          continue;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          setPhotoMsg("That photo is too large (max 10 MB).");
          continue;
        }

        // The same converter the feed uses: turns iPhone HEIC photos into
        // JPEGs (even in Chrome and Firefox, via our server) and shrinks big
        // photos. Uploading a raw HEIC is what used to show up blank.
        let ready: File;
        try {
          ready = await prepareImage(file);
        } catch (err) {
          setPhotoMsg(
            err instanceof Error && err.message
              ? err.message
              : "That photo couldn't be read. Try a different one."
          );
          continue;
        }

        const path = `${user.id}/${crypto.randomUUID()}.${uploadExtension(ready)}`;
        const { error: upErr } = await supabase.storage
          .from("forum-images")
          .upload(path, ready, { contentType: ready.type || "image/jpeg" });
        if (upErr) {
          setPhotoMsg("A photo failed to upload. Try again.");
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
        // ignore, an orphaned file is harmless
      }
    }
  }

  async function submit() {
    if (title.trim().length < MIN_TITLE) {
      setError(`Give your post a title (at least ${MIN_TITLE} characters).`);
      return;
    }
    if (title.trim().length > MAX_TITLE) {
      setError(tooLongMessage("The title", title.trim().length, MAX_TITLE));
      return;
    }
    if (body.trim().length > MAX_OPENER) {
      setError(tooLongMessage("Your post", body.trim().length, MAX_OPENER));
      return;
    }
    if (!category) {
      setError("Pick a section for your post.");
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
        toLogin();
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

      {choices && choices.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 text-xs text-ocean-400">Section</p>
          <div className="flex flex-wrap gap-2">
            {choices.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => setCategory(c.slug)}
                aria-pressed={category === c.slug}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  category === c.slug
                    ? "border-ocean-400 bg-ocean-600 text-white"
                    : "border-ocean-800/70 bg-ocean-900/50 text-ocean-300 hover:border-ocean-600 hover:text-white"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No maxLength here on purpose: it silently chops pasted text. The
          counter shows the limit instead, and Post explains if it's over. */}
      <div className="flex items-baseline justify-between mb-1">
        <label className="block text-xs text-ocean-400">Title</label>
        <CharCounter length={title.trim().length} max={MAX_TITLE} />
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's your question or topic?"
        className={`${inputClass} mb-4`}
      />

      <div className="flex items-baseline justify-between mb-1">
        <label className="block text-xs text-ocean-400">Body</label>
        <CharCounter length={body.trim().length} max={MAX_OPENER} />
      </div>
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
              accept="image/*,image/heic,image/heif,.heic,.heif,.HEIC,.HEIF"
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
          href={category && !choices ? `/forums/${category}` : "/forums"}
          className="text-sm text-ocean-500 hover:text-ocean-300 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
