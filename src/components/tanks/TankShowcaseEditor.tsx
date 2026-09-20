"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ImagePlus,
  Loader2,
  Star,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  SPEC_FIELDS,
  MAX_TANK_PHOTOS,
  MAX_PHOTO_BYTES,
  MAX_DESCRIPTION,
  PHOTO_BUCKET,
  compressImage,
  type TankSpecs,
} from "@/lib/tanks/showcase";

/**
 * Everything that makes a tank page worth showing off, edited in place:
 * the photos (first one is the cover), the story, when it was set up and
 * the gear that runs it. Stock still lives in Tank Builder.
 */
export default function TankShowcaseEditor({
  tankId,
  userId,
  initial,
}: {
  tankId: string;
  userId: string;
  initial: {
    images: string[];
    description: string | null;
    startedOn: string | null;
    specs: TankSpecs;
  };
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<string[]>(initial.images);
  const [description, setDescription] = useState(initial.description ?? "");
  const [startedOn, setStartedOn] = useState(initial.startedOn ?? "");
  const [specs, setSpecs] = useState<TankSpecs>(initial.specs);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().slice(0, 10);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setMsg(null);
    setUploading(true);
    let n = images.length;
    try {
      for (const file of Array.from(files)) {
        if (n >= MAX_TANK_PHOTOS) {
          setMsg(`Up to ${MAX_TANK_PHOTOS} photos per tank.`);
          break;
        }
        if (!file.type.startsWith("image/")) {
          setMsg("Photos only, please.");
          continue;
        }
        if (file.size > MAX_PHOTO_BYTES) {
          setMsg("One photo was over 15 MB and was skipped.");
          continue;
        }
        let blob: Blob = file;
        let ext = "jpg";
        let type = "image/jpeg";
        try {
          blob = await compressImage(file);
        } catch {
          ext = (file.name.split(".").pop() || "jpg").toLowerCase();
          type = file.type || "image/jpeg";
        }
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: type });
        if (error) {
          setMsg("A photo didn't upload. Try that one again.");
          continue;
        }
        const url = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
        setImages((prev) => [...prev, url]);
        n++;
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function move(i: number, d: number) {
    setImages((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function makeCover(i: number) {
    setImages((prev) => [prev[i], ...prev.filter((_, k) => k !== i)]);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const cleanSpecs: TankSpecs = {};
    for (const { key } of SPEC_FIELDS) {
      const v = specs[key]?.trim();
      if (v) cleanSpecs[key] = v.slice(0, 120);
    }
    const { error } = await supabase
      .from("tanks")
      .update({
        images,
        description: description.trim() || null,
        started_on: startedOn || null,
        specs: cleanSpecs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tankId);
    setSaving(false);
    if (error) {
      setMsg(
        error.message.includes("column")
          ? "The database needs its step 55 update before this can save."
          : "Couldn't save. Try again."
      );
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400"
      >
        <Pencil className="h-4 w-4" /> Edit showcase
      </button>
    );
  }

  const input =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-ocean-500 focus:border-emerald-500/50 focus:outline-none";

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-ocean-950 sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <p className="font-display text-xl text-white">Edit showcase</p>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-ocean-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5">
          {/* Photos */}
          <section>
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-white">Photos</h3>
              <span className="text-xs text-ocean-500">
                {images.length} / {MAX_TANK_PHOTOS} · first one is the cover
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((src, i) => (
                <div key={src} className="group relative aspect-square overflow-hidden rounded-xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1.5 top-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold uppercase text-ocean-950">
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-1">
                    <div className="flex">
                      <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move earlier" className="p-1.5 text-white disabled:opacity-25">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="Move later" className="p-1.5 text-white disabled:opacity-25">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex">
                      {i !== 0 && (
                        <button type="button" onClick={() => makeCover(i)} aria-label="Make cover" className="p-1.5 text-amber-300">
                          <Star className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setImages((p) => p.filter((_, k) => k !== i))}
                        aria-label="Remove photo"
                        className="p-1.5 text-coral-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {images.length < MAX_TANK_PHOTOS && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/15 text-ocean-400 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
                >
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                  <span className="text-xs">{uploading ? "Uploading" : "Add photos"}</span>
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => addPhotos(e.target.files)}
            />
          </section>

          {/* Story */}
          <section>
            <label htmlFor="tank-desc" className="mb-2 block text-sm font-semibold text-white">
              About this tank
            </label>
            <textarea
              id="tank-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              rows={5}
              placeholder="What's the idea behind it? The scape, the stock, what you're proudest of, what went wrong along the way."
              className={`${input} resize-y leading-relaxed`}
            />
            <p className="mt-1 text-right text-xs text-ocean-500">
              The first line or two shows on your tank's tile. {description.length}/{MAX_DESCRIPTION}
            </p>
          </section>

          {/* When */}
          <section>
            <label htmlFor="tank-start" className="mb-2 block text-sm font-semibold text-white">
              Set up on
            </label>
            <input
              id="tank-start"
              type="date"
              max={today}
              value={startedOn}
              onChange={(e) => setStartedOn(e.target.value)}
              className={`${input} max-w-[14rem] [color-scheme:dark]`}
            />
          </section>

          {/* Gear */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-white">The setup</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {SPEC_FIELDS.map(({ key, label, placeholder }) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs text-ocean-400">{label}</span>
                  <input
                    value={specs[key] ?? ""}
                    onChange={(e) => setSpecs((s) => ({ ...s, [key]: e.target.value }))}
                    placeholder={placeholder}
                    maxLength={120}
                    className={input}
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-ocean-500">Leave anything blank and it won&apos;t show.</p>
          </section>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="min-w-0 text-sm text-coral-300">{msg}</p>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 text-sm text-ocean-300 hover:text-white">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
