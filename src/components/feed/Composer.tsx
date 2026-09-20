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

  return (
    <div
      className={`rounded-2xl border p-3 sm:p-4 ${
        society
          ? "border-amber-500/25 bg-gradient-to-b from-amber-500/[0.05] to-ocean-900/40"
          : "border-ocean-800/60 bg-ocean-900/40"
      }`}
    >
      <div className="flex gap-3">
        <Avatar name={name} src={avatar} society={society} size={40} />
        <div className="min-w-0 flex-1">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={body ? 3 : 1}
            autoFocus={autoFocus}
            placeholder={`What's happening in your tanks, ${name.split(" ")[0]}?`}
            style={{ boxShadow: "none" }}
            className="w-full resize-none border-0 bg-transparent px-0 py-2 text-base leading-snug text-white placeholder-ocean-600 outline-none focus:ring-0 sm:text-[15px]"
          />

          {drafts.length > 0 && (
            <div className="mb-3 grid grid-cols-4 gap-2">
              {drafts.map((d, i) => (
                <div key={d.preview} className="relative aspect-square overflow-hidden rounded-lg border border-ocean-800/60">
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

          {error && <p className="mb-2 text-sm text-coral-300">{error}</p>}

          <div className="mt-1 flex items-center justify-between gap-3 border-t border-ocean-800/50 pt-2">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy || drafts.length >= MAX_PHOTOS}
                className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-ocean-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
              >
                <ImagePlus className="h-4 w-4" />
                Photo
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
              {body.length > MAX_CHARS - 200 && (
                <span className={`text-xs ${body.length > MAX_CHARS ? "text-coral-300" : "text-ocean-500"}`}>
                  {MAX_CHARS - body.length}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={post}
              disabled={!canPost}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                society
                  ? "bg-amber-400 text-ocean-950 hover:bg-amber-300"
                  : "bg-ocean-500 text-white hover:bg-ocean-400"
              }`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Post
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
