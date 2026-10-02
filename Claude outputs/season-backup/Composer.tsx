"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "@/lib/images/prepareImage";
import Avatar from "@/components/profile/Avatar";

const MAX_PHOTOS = 4;
const MAX_CHARS = 2000;

type Draft = { file: File; preview: string };

/**
 * The post box. Text, up to four photos, done.
 *
 * Photos are converted (HEIC included) and uploaded to the person's own
 * folder in feed-photos only when they hit Post, so abandoning a draft
 * leaves nothing behind.
 */
export default function Composer({
  userId,
  name,
  avatar,
  society,
  onPosted,
  autoFocus = false,
}: {
  userId: string;
  name: string;
  avatar: string | null;
  society: boolean;
  onPosted: () => void;
  autoFocus?: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [body, setBody] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const canPost = !busy && (body.trim().length > 0 || drafts.length > 0) && body.length <= MAX_CHARS;

  function addFiles(list: FileList | null) {
    if (!list) return;
    const room = MAX_PHOTOS - drafts.length;
    const next = Array.from(list)
      .slice(0, room)
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));
    setDrafts((d) => [...d, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function removeDraft(i: number) {
    setDrafts((d) => {
      URL.revokeObjectURL(d[i].preview);
      return d.filter((_, j) => j !== i);
    });
  }

  async function post() {
    if (!canPost) return;
    setBusy(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const d of drafts) {
        const file = await prepareImage(d.file);
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: upErr } = await supabase.storage.from("feed-photos").upload(path, file);
        if (upErr) throw new Error(upErr.message);
        urls.push(supabase.storage.from("feed-photos").getPublicUrl(path).data.publicUrl);
      }
      const { error: rpcErr } = await supabase.rpc("create_feed_post", {
        p_body: body,
        p_images: urls,
      });
      if (rpcErr) throw new Error(rpcErr.message);

      drafts.forEach((d) => URL.revokeObjectURL(d.preview));
      setBody("");
      setDrafts([]);
      onPosted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post that.");
    } finally {
      setBusy(false);
    }
  }

  const hint = busy
    ? "Posting…"
    : body.length > MAX_CHARS
      ? `${body.length - MAX_CHARS} characters over`
      : !canPost
        ? "Write something or add a photo to post"
        : `Posting to everyone as ${name}`;

  return (
    <section
      aria-label="Create a post"
      className="rounded-2xl border border-ocean-600/40 bg-gradient-to-b from-ocean-800/50 to-ocean-900/60 p-4 shadow-lg shadow-black/30 sm:p-5"
    >
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={name} src={avatar} society={society} size={36} />
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-white">Create a post</p>
          <p className="text-xs text-ocean-400">Share a photo, a question or what&apos;s new in your tanks</p>
        </div>
      </div>

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        autoFocus={autoFocus}
        placeholder={`What's happening in your tanks, ${name.split(" ")[0]}?`}
        className="block w-full resize-none rounded-xl border border-ocean-700/70 bg-ocean-950/70 px-3.5 py-3 text-base leading-relaxed text-white placeholder-ocean-500 outline-none transition-colors focus:border-ocean-400 sm:text-[15px]"
      />

      {drafts.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {drafts.map((d, i) => (
            <div key={d.preview} className="relative aspect-square overflow-hidden rounded-lg border border-ocean-700/60">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={d.preview} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeDraft(i)}
                className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                aria-label="Remove photo"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-coral-300">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || drafts.length >= MAX_PHOTOS}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-ocean-600/60 px-3.5 text-sm font-medium text-ocean-100 transition-colors hover:bg-white/5 disabled:opacity-40"
        >
          <ImagePlus className="h-4 w-4" />
          {drafts.length > 0 ? `Photos ${drafts.length}/${MAX_PHOTOS}` : "Add photos"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <span className={`hidden min-w-0 flex-1 truncate text-xs sm:block ${body.length > MAX_CHARS ? "text-coral-300" : "text-ocean-500"}`}>
          {hint}
        </span>
        <button
          type="button"
          onClick={post}
          disabled={!canPost}
          className="ml-auto inline-flex h-10 items-center gap-2 rounded-xl bg-ocean-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-ocean-400 disabled:cursor-not-allowed disabled:bg-ocean-800 disabled:text-ocean-500"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Post
        </button>
      </div>
    </section>
  );
}
