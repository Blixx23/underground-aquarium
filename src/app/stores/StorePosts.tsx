"use client";

import { useState } from "react";
import { Megaphone, Plus, Pencil, Trash2, X, ImagePlus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Post = {
  id: string;
  title: string | null;
  body: string;
  images: string[] | null;
  createdAt: string;
};

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // input cap; resized/compressed below
const MAX_DIM = 1920; // longest edge after resize
const BUCKET = "store-post-images";

// Resize + compress in the browser before upload (mirrors the forum/tank pipeline).
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

export default function StorePosts({
  storeId,
  initialPosts,
  isOwner,
  currentUserId,
}: {
  storeId: string;
  initialPosts: Post[];
  isOwner: boolean;
  currentUserId: string | null;
}) {
  const [supabase] = useState(() => createClient());
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  const [composing, setComposing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOwner && posts.length === 0) return null;

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-selecting the same file later
    if (files.length === 0 || !currentUserId) return;
    setPhotoMsg(null);

    setUploading(true);
    let count = newImages.length;
    try {
      for (const file of files) {
        if (count >= MAX_PHOTOS) {
          setPhotoMsg(`Up to ${MAX_PHOTOS} photos per update.`);
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

        const path = `${currentUserId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob, { contentType });
        if (upErr) {
          setPhotoMsg("A photo failed to upload — try again.");
          continue;
        }
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        setNewImages((prev) => [...prev, data.publicUrl]);
        count++;
      }
    } finally {
      setUploading(false);
    }
  }

  async function removeNewImage(url: string) {
    setNewImages((prev) => prev.filter((u) => u !== url));
    const marker = `/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx !== -1) {
      const path = url.slice(idx + marker.length);
      try {
        await supabase.storage.from(BUCKET).remove([path]);
      } catch {
        // ignore — orphaned file is harmless
      }
    }
  }

  function resetComposer() {
    setComposing(false);
    setNewTitle("");
    setNewBody("");
    setNewImages([]);
    setPhotoMsg(null);
  }

  async function createPost() {
    const text = newBody.trim();
    if ((!text && newImages.length === 0) || busy || !currentUserId) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: insertError } = await supabase
        .from("store_posts")
        .insert({
          store_id: storeId,
          user_id: currentUserId,
          title: newTitle.trim() || null,
          body: text,
          images: newImages.length > 0 ? newImages : null,
        })
        .select("id,created_at")
        .single();
      if (insertError) throw insertError;
      const row = data as { id: string; created_at: string };
      setPosts((prev) => [
        {
          id: row.id,
          title: newTitle.trim() || null,
          body: text,
          images: newImages.length > 0 ? newImages : null,
          createdAt: row.created_at,
        },
        ...prev,
      ]);
      resetComposer();
    } catch {
      setError("Couldn't post that update. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(p: Post) {
    setEditingId(p.id);
    setEditTitle(p.title ?? "");
    setEditBody(p.body);
  }

  async function saveEdit(id: string) {
    const text = editBody.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const { error: upError } = await supabase
        .from("store_posts")
        .update({
          title: editTitle.trim() || null,
          body: text,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (upError) throw upError;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, title: editTitle.trim() || null, body: text } : p
        )
      );
      setEditingId(null);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  async function removePost(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      const { error: delError } = await supabase
        .from("store_posts")
        .delete()
        .eq("id", id);
      if (delError) throw delError;
      setPosts((prev) => prev.filter((p) => p.id !== id));
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40";

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl text-emerald-400 flex items-center gap-2">
          <Megaphone className="w-5 h-5" /> From the shop
        </h2>
        {isOwner && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/25 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Post an update
          </button>
        )}
      </div>

      {isOwner && composing && (
        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-medium">New update</p>
            <button
              onClick={resetComposer}
              aria-label="Close"
              className="text-ocean-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Title (optional) — e.g. Weekend restock"
              className={inputClass}
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={3}
              placeholder="What's new? New shipment, sale, event…"
              className={inputClass}
            />

            {/* Photos */}
            {newImages.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {newImages.map((url) => (
                  <div key={url} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt="Upload preview"
                      className="aspect-square w-full object-cover rounded-lg border border-white/10"
                    />
                    <button
                      onClick={() => removeNewImage(url)}
                      aria-label="Remove photo"
                      className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photoMsg && <p className="text-xs text-amber-300">{photoMsg}</p>}

            <div className="flex items-center justify-between gap-3">
              {newImages.length < MAX_PHOTOS ? (
                <label className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 text-ocean-300 px-3 py-1.5 text-xs cursor-pointer hover:text-white hover:border-white/20 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ImagePlus className="w-3.5 h-3.5" />
                  )}
                  {uploading ? "Uploading…" : "Add photos"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFiles}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              ) : (
                <span className="text-xs text-ocean-600">
                  Photo limit reached
                </span>
              )}

              {error && <p className="text-xs text-red-300">{error}</p>}

              <button
                onClick={createPost}
                disabled={busy || uploading || (!newBody.trim() && newImages.length === 0)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
              >
                {busy ? "Posting…" : "Post update"}
              </button>
            </div>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        isOwner &&
        !composing && (
          <p className="text-ocean-400 text-sm">
            No updates yet — post a restock or event to keep customers in the
            loop.
          </p>
        )
      ) : (
        <div className="space-y-3">
          {posts.map((p) =>
            editingId === p.id ? (
              <div
                key={p.id}
                className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3"
              >
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Title (optional)"
                  className={inputClass}
                />
                <textarea
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={3}
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(p.id)}
                    disabled={busy || !editBody.trim()}
                    className="rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-white/10 text-ocean-300 px-3 py-1.5 text-xs hover:text-white hover:border-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div
                key={p.id}
                className="rounded-xl bg-white/5 border border-white/10 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {p.title && (
                      <p className="text-white text-sm font-medium">{p.title}</p>
                    )}
                    <p className="text-ocean-500 text-xs">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => startEdit(p)}
                        aria-label="Edit update"
                        className="text-ocean-400 hover:text-white transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => removePost(p.id)}
                        aria-label="Delete update"
                        disabled={busy}
                        className="text-ocean-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {p.body && (
                  <p className="text-ocean-200 text-sm mt-2 whitespace-pre-wrap">
                    {p.body}
                  </p>
                )}
                {p.images && p.images.length > 0 && (
                  <div
                    className={
                      "mt-3 grid gap-2 " +
                      (p.images.length === 1 ? "grid-cols-1" : "grid-cols-2")
                    }
                  >
                    {p.images.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt="Shop update"
                        className="w-full max-h-96 object-cover rounded-lg border border-white/10"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
