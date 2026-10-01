"use client";

import { useRef, useState } from "react";
import { ImageIcon, Film, Ban, Upload, Loader2, Link2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { prepareImage, isImageFile, uploadExtension } from "@/lib/images/prepareImage";
import { uploadResumable } from "@/lib/storage/uploadResumable";
import { normaliseVideoUrl, videoHint, isVideoFile } from "@/lib/courses/video";

export const COURSE_MEDIA_BUCKET = "course-media";

/** Biggest video file the course uploader will send. Matches the bucket limit in the SQL. */
const MAX_COURSE_VIDEO_BYTES = 200 * 1024 * 1024;

export type MediaMode = "none" | "image" | "video";

export type LessonMediaValue = {
  mode: MediaMode;
  image_url: string;
  video_url: string;
};

function videoExt(file: File) {
  const m = file.name.match(/\.([a-z0-9]{2,5})$/i);
  if (m) return m[1].toLowerCase();
  if (file.type === "video/webm") return "webm";
  if (file.type === "video/quicktime") return "mov";
  return "mp4";
}

/**
 * The picture or video that sits above a lesson's text.
 *
 * One lesson shows one thing: a branded image, a video, or nothing. Images
 * can be uploaded or pasted as a link; videos can be a YouTube/Vimeo link or
 * a file uploaded straight to our own storage.
 */
export default function LessonMedia({
  sectionId,
  value,
  onChange,
  onBusyChange,
}: {
  sectionId: string;
  value: LessonMediaValue;
  onChange: (next: LessonMediaValue) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const supabase = createClient();
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | "image" | "video">(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function setBusyState(b: null | "image" | "video") {
    setBusy(b);
    onBusyChange?.(b !== null);
  }

  function objectPath(ext: string) {
    return `${sectionId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  }

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setError(null);
    if (!isImageFile(picked)) {
      setError("That isn't an image. Use a JPG, PNG, or WebP.");
      return;
    }
    setBusyState("image");
    try {
      const ready = await prepareImage(picked);
      const path = objectPath(uploadExtension(ready));
      const { error: upErr } = await supabase.storage
        .from(COURSE_MEDIA_BUCKET)
        .upload(path, ready, { contentType: ready.type || "image/jpeg" });
      if (upErr) {
        throw new Error(
          /bucket not found/i.test(upErr.message)
            ? "Uploads aren't switched on yet. Run the course media SQL first."
            : upErr.message
        );
      }
      const url = supabase.storage.from(COURSE_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
      onChange({ ...value, mode: "image", image_url: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that image.");
    } finally {
      setBusyState(null);
    }
  }

  async function onPickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    e.target.value = "";
    if (!picked) return;
    setError(null);
    if (!picked.type.startsWith("video/") && !/\.(mp4|webm|mov|m4v)$/i.test(picked.name)) {
      setError("That isn't a video. Use an MP4 or WebM file.");
      return;
    }
    if (picked.size > MAX_COURSE_VIDEO_BYTES) {
      setError("That video is over 200 MB. Export it at 1080p and try again.");
      return;
    }
    setBusyState("video");
    setProgress(0);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Your session expired. Sign in again.");
      const path = objectPath(videoExt(picked));
      await uploadResumable(picked, COURSE_MEDIA_BUCKET, path, token, setProgress);
      const url = supabase.storage.from(COURSE_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
      onChange({ ...value, mode: "video", video_url: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't upload that video.");
    } finally {
      setBusyState(null);
    }
  }

  const label = "block text-xs font-mono uppercase tracking-wider text-ocean-500 mb-1.5";
  const input =
    "w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";
  const pill = (active: boolean) =>
    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors " +
    (active
      ? "border-ocean-400 bg-ocean-800/60 text-white"
      : "border-ocean-800/60 text-ocean-300 hover:border-ocean-600 hover:text-white");
  const uploadBtn =
    "inline-flex items-center gap-2 rounded-full bg-ocean-700 hover:bg-ocean-600 px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-60";

  const hint = videoHint(value.video_url);
  const resolvedVideo = normaliseVideoUrl(value.video_url);
  const isUploadedVideo = !!resolvedVideo && resolvedVideo.includes(`/${COURSE_MEDIA_BUCKET}/`);

  return (
    <div>
      <label className={label}>Lesson visual</label>
      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          onClick={() => onChange({ ...value, mode: "none" })}
          className={pill(value.mode === "none")}
          disabled={busy !== null}
        >
          <Ban className="w-3.5 h-3.5" /> None
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, mode: "image" })}
          className={pill(value.mode === "image")}
          disabled={busy !== null}
        >
          <ImageIcon className="w-3.5 h-3.5" /> Image
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...value, mode: "video" })}
          className={pill(value.mode === "video")}
          disabled={busy !== null}
        >
          <Film className="w-3.5 h-3.5" /> Video
        </button>
      </div>

      {value.mode === "image" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => imageInput.current?.click()}
              disabled={busy !== null}
              className={uploadBtn}
            >
              {busy === "image" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {value.image_url ? "Replace image" : "Upload image"}
            </button>
            {value.image_url && (
              <button
                type="button"
                onClick={() => onChange({ ...value, image_url: "" })}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 text-sm text-ocean-400 hover:text-coral-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
            <input
              ref={imageInput}
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={onPickImage}
            />
          </div>
          <div>
            <p className="text-xs text-ocean-500 mb-1.5 inline-flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Or paste an image link
            </p>
            <input
              value={value.image_url}
              onChange={(e) => onChange({ ...value, image_url: e.target.value })}
              placeholder="https://…"
              className={input}
            />
          </div>
          {value.image_url.trim() && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value.image_url.trim()}
              alt="Lesson visual preview"
              className="rounded-xl border border-ocean-800/60 max-w-md w-full h-auto"
            />
          )}
          <p className="text-xs text-ocean-500">
            Wide images (16:9, like 1600×900) fit best. Shown above the lesson text.
          </p>
        </div>
      )}

      {value.mode === "video" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => videoInput.current?.click()}
              disabled={busy !== null}
              className={uploadBtn}
            >
              {busy === "video" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {busy === "video" ? `Uploading ${progress}%` : isUploadedVideo ? "Replace video" : "Upload video file"}
            </button>
            {value.video_url && busy === null && (
              <button
                type="button"
                onClick={() => onChange({ ...value, video_url: "" })}
                className="inline-flex items-center gap-1.5 text-sm text-ocean-400 hover:text-coral-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            )}
            <input
              ref={videoInput}
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
              className="hidden"
              onChange={onPickVideo}
            />
          </div>
          {busy === "video" && (
            <div className="h-1.5 max-w-md rounded-full bg-ocean-900 overflow-hidden">
              <div className="h-full bg-emerald-400/80 transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          <div>
            <p className="text-xs text-ocean-500 mb-1.5 inline-flex items-center gap-1">
              <Link2 className="w-3 h-3" /> Or paste a YouTube or Vimeo link
            </p>
            <input
              value={value.video_url}
              onChange={(e) => onChange({ ...value, video_url: e.target.value })}
              placeholder="Paste any YouTube link, or a direct .mp4 address"
              className={input}
            />
            <p className={"text-xs mt-1.5 " + (hint.ok ? "text-ocean-500" : "text-amber-400")}>
              {value.video_url.trim()
                ? hint.text
                : "Leave empty to show the “video coming soon” placeholder."}
            </p>
          </div>
          {resolvedVideo && hint.ok && (
            <div className="rounded-xl overflow-hidden border border-ocean-800/60 bg-ocean-950 aspect-video max-w-md">
              {isVideoFile(resolvedVideo) ? (
                <video src={resolvedVideo} className="w-full h-full bg-black" controls preload="metadata" />
              ) : (
                <iframe
                  src={resolvedVideo}
                  title="Preview"
                  className="w-full h-full"
                  allow="encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              )}
            </div>
          )}
          <p className="text-xs text-ocean-500">
            Uploads up to 200 MB. MP4 plays everywhere; iPhone .mov files may not play in Chrome, so export as MP4.
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-coral-200 mt-3 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
