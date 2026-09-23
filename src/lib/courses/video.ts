/**
 * Turn whatever someone pastes into something a browser will actually play.
 *
 * The course player frames video in an iframe, and YouTube refuses to be
 * framed from a /watch link. So a perfectly valid link copied out of the
 * address bar produces a grey box and no error anyone can see. Rather than
 * ask people to know that, we convert it.
 *
 * Direct files are returned untouched; the player renders those in a real
 * <video> element instead.
 */

export type VideoKind = "youtube" | "vimeo" | "file" | "embed" | "empty" | "unknown";

/** A direct video file we host, as opposed to an embeddable page. */
export function isVideoFile(url: string): boolean {
  const path = url.split("?")[0].split("#")[0].toLowerCase();
  return /\.(mp4|webm|ogv|ogg|mov|m4v)$/.test(path);
}

/** Pull the id out of any shape of YouTube link. */
function youtubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?(?:.*&)?v=([A-Za-z0-9_-]{6,})/i,
    /youtu\.be\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/i,
    /youtube\.com\/live\/([A-Za-z0-9_-]{6,})/i,
    /youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

function vimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d{6,})/i);
  return m ? m[1] : null;
}

/** What kind of link is this? Used to tell the person what will happen. */
export function videoKind(raw: string): VideoKind {
  const url = (raw ?? "").trim();
  if (!url) return "empty";
  if (isVideoFile(url)) return "file";
  if (youtubeId(url)) return "youtube";
  if (vimeoId(url)) return "vimeo";
  if (/^https?:\/\/.+\/embed\//i.test(url)) return "embed";
  return "unknown";
}

/**
 * The URL to actually store and render. Idempotent: running it on an
 * already-converted embed URL returns the same thing.
 */
export function normaliseVideoUrl(raw: string | null | undefined): string | null {
  const url = (raw ?? "").trim();
  if (!url) return null;

  const yt = youtubeId(url);
  if (yt) {
    // rel=0 keeps the end screen from advertising other channels' videos,
    // which is not what you want at the end of a lesson. playsinline stops
    // iOS Safari hijacking the whole screen the moment someone taps play,
    // which would hide the lesson text sitting underneath it.
    return `https://www.youtube.com/embed/${yt}?rel=0&playsinline=1`;
  }

  const vi = vimeoId(url);
  if (vi) return `https://player.vimeo.com/video/${vi}`;

  return url;
}

/** One short line telling the admin what we made of their link. */
export function videoHint(raw: string): { ok: boolean; text: string } {
  switch (videoKind(raw)) {
    case "empty":
      return { ok: true, text: "Leave this empty to show the “coming soon” placeholder." };
    case "youtube":
      return { ok: true, text: "YouTube link recognised. It will be converted to an embed automatically." };
    case "vimeo":
      return { ok: true, text: "Vimeo link recognised. It will be converted to an embed automatically." };
    case "file":
      return { ok: true, text: "Direct video file. It will play in the built-in player." };
    case "embed":
      return { ok: true, text: "Embed URL. Used as-is." };
    default:
      return {
        ok: false,
        text: "This doesn’t look like a video link. Paste a YouTube or Vimeo URL, or a direct .mp4 address.",
      };
  }
}
