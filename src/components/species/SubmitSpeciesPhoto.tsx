"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, CheckCircle2, ImagePlus, Loader2, Trophy, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage } from "@/lib/images/prepareImage";

const MAX_PHOTOS = 5;
const MIN_LONG_EDGE = 1600;
const MIN_SHORT_EDGE = 900;

type Mine = { pending: number };

/** Pixel size of a web-ready image file. */
async function measure(file: File): Promise<{ w: number; h: number } | null> {
  try {
    if (typeof createImageBitmap === "function") {
      const bmp = await createImageBitmap(file);
      const out = { w: bmp.width, h: bmp.height };
      bmp.close();
      return out;
    }
  } catch {
    /* fall through to an <img> tag */
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

function extFor(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

/**
 * "Submit a photo" on a species page. States the quality bar before
 * anyone picks a file, checks the size in the browser, and sends the
 * photo to the admin review queue.
 */
export default function SubmitSpeciesPhoto({
  speciesId,
  slug,
  name,
  approvedCount,
}: {
  speciesId: string;
  slug: string;
  name: string;
  approvedCount: number;
}) {
  const [supabase] = useState(() => createClient());
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [mine, setMine] = useState<Mine>({ pending: 0 });
  const [open, setOpen] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [caption, setCaption] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!live) return;
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { count } = await supabase
        .from("species_photos")
        .select("id", { count: "exact", head: true })
        .eq("species_id", speciesId)
        .eq("user_id", uid)
        .eq("status", "pending");
      if (live) setMine({ pending: count ?? 0 });
    });
    return () => {
      live = false;
    };
  }, [supabase, speciesId]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const full = approvedCount >= MAX_PHOTOS;
  const atLimit = mine.pending >= 2;

  function reset() {
    setFile(null);
    setPreview(null);
    setSize(null);
    setCaption("");
    setConfirm(false);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function pick(list: FileList | null) {
    const raw = list?.[0];
    if (!raw) return;
    setError(null);
    setPreparing(true);
    try {
      const ready = await prepareImage(raw);
      const dims = await measure(ready);
      if (!dims) throw new Error("We couldn't read that photo. Try a JPEG or PNG.");
      const long = Math.max(dims.w, dims.h);
      const short = Math.min(dims.w, dims.h);
      if (long < MIN_LONG_EDGE || short < MIN_SHORT_EDGE) {
        throw new Error(
          `That photo is ${dims.w} × ${dims.h}. We need at least ${MIN_LONG_EDGE} pixels on the long side, so use the original from your camera, not a crop or screenshot.`
        );
      }
      setFile(ready);
      setSize(dims);
      setPreview(URL.createObjectURL(ready));
    } catch (e) {
      setFile(null);
      setPreview(null);
      setSize(null);
      setError(e instanceof Error ? e.message : "Couldn't use that photo.");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setPreparing(false);
    }
  }

  async function submit() {
    if (!file || !size || !userId) return;
    if (!confirm) {
      setError("Tick the box to confirm this is your own photo of your own fish.");
      return;
    }
    setSending(true);
    setError(null);
    const path = `${userId}/${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${extFor(file)}`;
    try {
      const { error: upErr } = await supabase.storage
        .from("species-photos")
        .upload(path, file, { contentType: file.type || "image/jpeg" });
      if (upErr) throw new Error(upErr.message);
      const url = supabase.storage.from("species-photos").getPublicUrl(path).data.publicUrl;

      const { error: rpcErr } = await supabase.rpc("submit_species_photo", {
        p_slug: slug,
        p_url: url,
        p_path: path,
        p_width: size.w,
        p_height: size.h,
        p_caption: caption.trim() || null,
        p_confirm: confirm,
      });
      if (rpcErr) {
        await supabase.storage.from("species-photos").remove([path]);
        throw new Error(rpcErr.message);
      }
      setSent(true);
      setMine((m) => ({ pending: m.pending + 1 }));
      reset();
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't send that photo.");
    } finally {
      setSending(false);
    }
  }

  if (full) {
    return (
      <p className="mb-8 text-xs text-ocean-500">
        All {MAX_PHOTOS} photo spots for this fish are filled by members.
      </p>
    );
  }

  const cta = approvedCount === 0 ? `Be the first to add a photo of your ${name}` : `Submit a photo of your ${name}`;

  return (
    <section className="mb-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
      {!open && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-medium text-white">
              <Camera className="h-4 w-4 text-emerald-300" /> {cta}
            </p>
            <p className="mt-0.5 text-xs text-ocean-400">
              High quality photos from your own tank only. If yours is used: +50 bubbles, your name on this page and
              a trophy.
            </p>
            {mine.pending > 0 && (
              <p className="mt-1 text-xs text-amber-300">
                You have {mine.pending} photo{mine.pending === 1 ? "" : "s"} of this fish waiting for review.
              </p>
            )}
            {sent && (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sent for review. You&apos;ll get a notification either way.
              </p>
            )}
          </div>
          {userId === null ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/species/${slug}`)}`}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
            >
              Sign in to submit
            </Link>
          ) : (
            <button
              type="button"
              disabled={userId === undefined || atLimit}
              onClick={() => {
                setSent(false);
                setOpen(true);
              }}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
            >
              <ImagePlus className="h-4 w-4" /> {atLimit ? "2 waiting already" : "Submit a photo"}
            </button>
          )}
        </div>
      )}

      {open && (
        <div>
          <div className="mb-3 flex items-start justify-between gap-3">
            <p className="flex items-center gap-2 font-medium text-white">
              <Camera className="h-4 w-4 text-emerald-300" /> Submit a photo of your {name}
            </p>
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              aria-label="Close"
              className="rounded-full p-1 text-ocean-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 rounded-xl border border-white/10 bg-ocean-950/40 p-3 text-sm text-ocean-300">
            <p className="mb-2 font-medium text-white">Only high quality photos are used. We&apos;re looking for:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Your own fish, in your own tank. No photos from the internet, a store or someone else.</li>
              <li>Sharp and well lit, with the fish in focus and filling a good part of the frame.</li>
              <li>The original from your camera or phone, at least {MIN_LONG_EDGE} pixels on the long side.</li>
              <li>No watermarks, text, borders, collages, heavy filters or screenshots.</li>
              <li>The right species. Every photo is checked by hand before it goes live.</li>
            </ul>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ocean-400">
              <Trophy className="h-3.5 w-3.5 text-amber-300" /> Up to {MAX_PHOTOS} photos per species. If yours is
              used you earn 50 bubbles and count toward the Species Photographer trophies.
            </p>
          </div>

          {preview ? (
            <div className="mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Your photo"
                className="max-h-80 w-full rounded-xl border border-white/10 bg-ocean-950/60 object-contain"
              />
              <div className="mt-1 flex items-center justify-between text-xs text-ocean-500">
                <span>
                  {size?.w} × {size?.h}
                </span>
                <button type="button" onClick={reset} className="text-ocean-300 hover:text-white">
                  Choose a different photo
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={preparing}
              className="mb-3 flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-10 text-sm text-ocean-300 hover:bg-white/5 disabled:opacity-60"
            >
              {preparing ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
              {preparing ? "Checking your photo…" : "Choose a photo"}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={(e) => pick(e.target.files)}
          />

          <input
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, 140))}
            placeholder="Caption (optional): male in breeding colour, 40 gallon planted"
            className="mb-3 w-full rounded-lg border border-ocean-800/60 bg-ocean-900/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:border-ocean-500 focus:outline-none"
          />

          <label className="mb-3 flex items-start gap-2 text-sm text-ocean-300">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-500"
            />
            <span>
              I took this photo of my own fish, and Underground Aquarium can show it on this page with my name on it.
            </span>
          </label>

          {error && <p className="mb-3 text-sm text-coral-300">{error}</p>}

          <button
            type="button"
            onClick={submit}
            disabled={!file || sending || preparing}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-ocean-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Send for review
          </button>
        </div>
      )}

      {!open && error && <p className="mt-2 text-sm text-coral-300">{error}</p>}
    </section>
  );
}
