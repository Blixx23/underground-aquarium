"use client";

import { useState } from "react";
import { ImagePlus, Loader2, Pencil, Trash2, X, Images } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage, isImageFile } from "@/lib/images/prepareImage";
import ShopLogo from "./ShopLogo";
import PhotoCollage from "./PhotoCollage";
import PhotoViewer, { type ViewerPhoto } from "./PhotoViewer";

export type TimelinePost = {
  kind: "post";
  id: string;
  title: string | null;
  body: string;
  images: string[] | null;
  createdAt: string;
};

/** Photos the shop added to its gallery on one day, shown as one post. */
export type TimelineAlbum = {
  kind: "album";
  id: string;
  images: string[];
  createdAt: string;
};

export type TimelineItem = TimelinePost | TimelineAlbum;

const MAX_PHOTOS = 4;
const BUCKET = "store-post-images";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "America/Los_Angeles",
});
function when(iso: string) {
  return dateFmt.format(new Date(iso));
}

/**
 * The shop's timeline: what the owner posts, newest first, like a Facebook
 * business page. Owners get a post box at the top and can edit or delete
 * their posts. Everyone can tap a photo to see it full screen.
 */
export default function ShopTimeline({
  storeId,
  storeName,
  logoUrl,
  initial,
  isOwner,
  currentUserId,
  emptyText,
}: {
  storeId: string;
  storeName: string;
  logoUrl: string | null;
  initial: TimelineItem[];
  isOwner: boolean;
  currentUserId: string | null;
  emptyText?: string;
}) {
  const [supabase] = useState(() => createClient());
  const [items, setItems] = useState<TimelineItem[]>(initial);

  // Composer
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editImages, setEditImages] = useState<string[]>([]);

  // Viewer
  const [viewer, setViewer] = useState<{ photos: ViewerPhoto[]; index: number } | null>(null);

  async function addPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length || !currentUserId) return;
    setNote(null);
    setUploading(true);
    let count = images.length;
    try {
      for (const file of files) {
        if (count >= MAX_PHOTOS) {
          setNote(`Up to ${MAX_PHOTOS} photos per post. Post the rest in another update.`);
          break;
        }
        if (!isImageFile(file)) {
          setNote("Photos only, please.");
          continue;
        }
        try {
          const ready = await prepareImage(file);
          const path = `${currentUserId}/${crypto.randomUUID()}.jpg`;
          const { error: upErr } = await supabase.storage
            .from(BUCKET)
            .upload(path, ready, { contentType: "image/jpeg" });
          if (upErr) throw upErr;
          const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
          setImages((prev) => [...prev, url]);
          count++;
        } catch {
          setNote("A photo didn't upload. Please try that one again.");
        }
      }
    } finally {
      setUploading(false);
    }
  }

  function resetComposer() {
    setComposing(false);
    setTitle("");
    setBody("");
    setImages([]);
    setNote(null);
    setError(null);
  }

  async function publish() {
    const text = body.trim();
    if ((!text && images.length === 0) || busy || !currentUserId) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: insErr } = await supabase
        .from("store_posts")
        .insert({
          store_id: storeId,
          user_id: currentUserId,
          title: title.trim() || null,
          body: text,
          images: images.length ? images : null,
        })
        .select("id, created_at")
        .single();
      if (insErr) throw insErr;
      const row = data as { id: string; created_at: string };
      setItems((prev) => [
        {
          kind: "post",
          id: row.id,
          title: title.trim() || null,
          body: text,
          images: images.length ? images : null,
          createdAt: row.created_at,
        },
        ...prev,
      ]);
      // Followers get a bell notification. Fire and forget.
      fetch("/api/stores/notify-followers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: row.id }),
      }).catch(() => {});
      resetComposer();
    } catch {
      setError("Couldn't post that. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: TimelinePost) {
    setEditingId(p.id);
    setEditTitle(p.title ?? "");
    setEditBody(p.body);
    setEditImages(p.images ?? []);
  }

  async function saveEdit(id: string) {
    const text = editBody.trim();
    if ((!text && editImages.length === 0) || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { error: upErr } = await supabase
        .from("store_posts")
        .update({
          title: editTitle.trim() || null,
          body: text,
          images: editImages.length ? editImages : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (upErr) throw upErr;
      setItems((prev) =>
        prev.map((it) =>
          it.kind === "post" && it.id === id
            ? { ...it, title: editTitle.trim() || null, body: text, images: editImages.length ? editImages : null }
            : it
        )
      );
      setEditingId(null);
    } catch {
      setError("Couldn't save your changes. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    if (!confirm("Delete this post? This can't be undone.")) return;
    setBusy(true);
    try {
      const { error: delErr } = await supabase.from("store_posts").delete().eq("id", id);
      if (delErr) throw delErr;
      setItems((prev) => prev.filter((it) => !(it.kind === "post" && it.id === id)));
    } catch {
      setError("Couldn't delete that post. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:outline-none";

  const byline = (createdAt: string, extra?: React.ReactNode) => (
    <div className="flex items-center gap-3">
      <ShopLogo name={storeName} url={logoUrl} size={40} />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">
          {storeName}
          {extra}
        </p>
        <p className="text-xs text-ocean-500">{when(createdAt)}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Post box, owners only */}
      {isOwner && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-4">
          {!composing ? (
            <button
              type="button"
              onClick={() => setComposing(true)}
              className="flex w-full items-center gap-3 text-left"
            >
              <ShopLogo name={storeName} url={logoUrl} size={40} />
              <span className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-ocean-400 hover:bg-white/10">
                Share a restock, sale or new arrival…
              </span>
              <span className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm text-emerald-300 sm:inline-flex">
                <ImagePlus className="h-4 w-4" /> Photo
              </span>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {byline(new Date().toISOString())}
                <button type="button" onClick={resetComposer} aria-label="Close" className="text-ocean-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Headline (optional), like Weekend restock"
                className={field}
                maxLength={120}
              />
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                placeholder="What's new? A shipment, a sale, an event…"
                className={field}
                autoFocus
              />
              {images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {images.map((url) => (
                    <div key={url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="aspect-square w-full rounded-lg border border-white/10 object-cover" />
                      <button
                        type="button"
                        onClick={() => setImages((p) => p.filter((u) => u !== url))}
                        aria-label="Remove photo"
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {note && <p className="text-xs text-amber-300">{note}</p>}
              {error && <p className="text-xs text-coral-300">{error}</p>}
              <div className="flex items-center justify-between gap-3">
                {images.length < MAX_PHOTOS ? (
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-2 text-sm text-ocean-200 hover:bg-white/5">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4 text-emerald-300" />}
                    {uploading ? "Uploading…" : "Add photos"}
                    <input
                      type="file"
                      accept="image/*,.heic,.heif"
                      multiple
                      onChange={addPhotos}
                      disabled={uploading}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <span className="text-xs text-ocean-500">{MAX_PHOTOS} photos is the most per post</span>
                )}
                <button
                  type="button"
                  onClick={publish}
                  disabled={busy || uploading || (!body.trim() && images.length === 0)}
                  className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
                >
                  {busy ? "Posting…" : "Post"}
                </button>
              </div>
              <p className="text-xs text-ocean-500">
                Shows on your shop page, and people following your shop get a notification.
              </p>
            </div>
          )}
        </div>
      )}

      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ocean-800/60 px-6 py-12 text-center">
          <Images className="mx-auto mb-3 h-8 w-8 text-ocean-700" />
          <p className="text-sm text-ocean-400">
            {isOwner
              ? "Nothing posted yet. Your first restock or sale post goes right here."
              : emptyText || `${storeName} hasn't posted anything yet.`}
          </p>
        </div>
      )}

      {items.map((it) => {
        if (it.kind === "album") {
          return (
            <article key={it.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
              <div className="px-4 pt-4 pb-3">
                {byline(
                  it.createdAt,
                  <span className="font-normal text-ocean-300">
                    {" "}added {it.images.length} photo{it.images.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <PhotoCollage
                images={it.images}
                alt={`Photo from ${storeName}`}
                onOpen={(index) => setViewer({ photos: it.images.map((url) => ({ url })), index })}
              />
            </article>
          );
        }

        if (editingId === it.id) {
          return (
            <article key={it.id} className="space-y-3 rounded-2xl border border-emerald-500/30 bg-white/[0.04] p-4">
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Headline (optional)"
                className={field}
                maxLength={120}
              />
              <textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={4} className={field} />
              {editImages.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {editImages.map((url) => (
                    <div key={url} className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="aspect-square w-full rounded-lg border border-white/10 object-cover" />
                      <button
                        type="button"
                        onClick={() => setEditImages((p) => p.filter((u) => u !== url))}
                        aria-label="Remove photo from this post"
                        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {error && <p className="text-xs text-coral-300">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveEdit(it.id)}
                  disabled={busy || (!editBody.trim() && editImages.length === 0)}
                  className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-ocean-300 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </article>
          );
        }

        const imgs = it.images ?? [];
        return (
          <article key={it.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
            <div className="px-4 pt-4">
              <div className="flex items-start justify-between gap-3">
                {byline(it.createdAt)}
                {isOwner && (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(it)}
                      aria-label="Edit post"
                      className="rounded-full p-2 text-ocean-400 hover:bg-white/5 hover:text-white"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(it.id)}
                      aria-label="Delete post"
                      disabled={busy}
                      className="rounded-full p-2 text-ocean-400 hover:bg-white/5 hover:text-coral-300 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
              {it.title && <h3 className="mt-3 font-medium text-white">{it.title}</h3>}
              {it.body && (
                <p className={`whitespace-pre-wrap text-[15px] leading-relaxed text-ocean-100 ${it.title ? "mt-1" : "mt-3"}`}>
                  {it.body}
                </p>
              )}
            </div>
            <div className={imgs.length ? "mt-3" : "pb-4"}>
              <PhotoCollage
                images={imgs}
                alt={it.title || `Photo from ${storeName}`}
                onOpen={(index) => setViewer({ photos: imgs.map((url) => ({ url, caption: it.title })), index })}
              />
            </div>
          </article>
        );
      })}

      <PhotoViewer
        photos={viewer?.photos ?? []}
        index={viewer?.index ?? null}
        onChange={(index) => setViewer((v) => (v ? { ...v, index } : v))}
        onClose={() => setViewer(null)}
      />
    </div>
  );
}
