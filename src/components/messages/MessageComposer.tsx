"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage, isImageFile } from "@/lib/images/prepareImage";
import { MAX_MESSAGE_PHOTOS } from "@/lib/messages";

type Photo = { file: File; preview: string };

export default function MessageComposer({
  threadId,
  listingSlug,
  toUserId,
  placeholder,
  autoFocus,
  submitLabel,
  quickReplies,
}: {
  /** Replying inside an existing conversation. */
  threadId?: string;
  /** Starting a new conversation about a listing. */
  listingSlug?: string;
  /** Starting a direct conversation with a member. */
  toUserId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  submitLabel?: string;
  /** One-tap starters shown above the box. Tapping fills the box; it doesn't send. */
  quickReplies?: readonly string[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Free any leftover preview images when the box goes away (removed ones are freed in removePhoto).
  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_MESSAGE_PHOTOS - photos.length;
    if (room <= 0) {
      setError(`Up to ${MAX_MESSAGE_PHOTOS} photos per message.`);
      return;
    }
    setPreparing(true);
    const added: Photo[] = [];
    for (const original of Array.from(files).slice(0, room)) {
      if (!isImageFile(original)) continue;
      try {
        const file = await prepareImage(original);
        added.push({ file, preview: URL.createObjectURL(file) });
      } catch {
        setError("One of those photos couldn't be read. Try a different one.");
      }
    }
    setPhotos((prev) => [...prev, ...added]);
    setPreparing(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removePhoto(i: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, j) => j !== i);
    });
  }

  async function uploadPhotos(): Promise<string[]> {
    if (!photos.length) return [];
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Please sign in again.");
    const urls: string[] = [];
    for (const p of photos) {
      // Same bucket and folder shape as ad photos (sender's own folder), so the existing upload rules cover it.
      const path = `${user.id}/msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error: e } = await supabase.storage
        .from("listing-images")
        .upload(path, p.file, { contentType: p.file.type || "image/jpeg", upsert: false });
      if (e) throw new Error("A photo didn't upload. Try again.");
      urls.push(supabase.storage.from("listing-images").getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  async function send() {
    const trimmed = body.trim();
    if ((!trimmed && !photos.length) || busy || preparing) return;

    setBusy(true);
    setError(null);
    try {
      const images = await uploadPhotos();
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, listingSlug, toUserId, body: trimmed, images }),
      });
      const data = (await res.json()) as { threadId?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "That didn't send. Try again.");
        setBusy(false);
        return;
      }

      setBody("");
      setPhotos([]);
      if (threadId) {
        router.refresh();
        setBusy(false);
      } else if (data.threadId) {
        router.push(`/messages/${data.threadId}`);
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "That didn't send. Check your connection and try again.");
      setBusy(false);
    }
  }

  const canSend = (body.trim() || photos.length) && !busy && !preparing;

  return (
    <div>
      {error && (
        <div className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-300 mb-3">
          {error}
        </div>
      )}

      {quickReplies && quickReplies.length > 0 && !body && (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {quickReplies.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                setBody(q);
                textRef.current?.focus();
              }}
              className="shrink-0 rounded-full border border-ocean-700/60 bg-ocean-900/60 px-3 py-1.5 text-xs text-ocean-200 transition-colors hover:border-emerald-500/60 hover:text-white"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {photos.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {photos.map((p, i) => (
            <div key={p.preview} className="relative h-20 w-20 overflow-hidden rounded-xl border border-ocean-800/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(i)}
                aria-label="Remove photo"
                className="absolute right-1 top-1 rounded-full bg-ocean-950/80 p-1 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends, Shift+Enter makes a new line.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        rows={3}
        maxLength={4000}
        autoFocus={autoFocus}
        placeholder={placeholder ?? "Write a message…"}
        className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-base sm:text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors resize-none"
      />

      <div className="flex items-center justify-between gap-3 mt-3">
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addPhotos(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={preparing || busy || photos.length >= MAX_MESSAGE_PHOTOS}
            className="inline-flex items-center gap-2 rounded-xl border border-ocean-700/60 px-3 py-2.5 text-sm text-ocean-200 transition-colors hover:border-ocean-600 hover:text-white disabled:opacity-50"
          >
            {preparing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            Photo
          </button>
          <p className="hidden text-xs text-ocean-600 sm:block">Enter sends · Shift + Enter for a new line</p>
        </div>
        <button
          type="button"
          onClick={send}
          disabled={!canSend}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ocean-600 text-white font-medium hover:bg-ocean-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {busy ? "Sending…" : submitLabel ?? "Send"}
        </button>
      </div>
    </div>
  );
}
