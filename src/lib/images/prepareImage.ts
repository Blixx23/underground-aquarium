// ---------------------------------------------------------------------------
// Turns whatever a phone hands us into a web-friendly JPEG.
//
// HEIC is the awkward one. iPhones shoot it by default, and browsers disagree
// about it: Safari and iOS decode it natively, Chrome and Firefox can't touch
// it at all. So we try three things in order, and only give up if all three
// fail:
//
//   1. createImageBitmap() — native decode. Free and instant where it works,
//      which is every Apple device, i.e. where HEIC files come from.
//   2. An <img> tag — same idea, for older Safari without createImageBitmap.
//   3. heic2any — a WebAssembly decoder. Slow and not always reliable, so it
//      is the last resort rather than the first move.
//
// Whatever decodes, we then redraw it onto a canvas at a sane size and export
// JPEG. That also strips the 8–12MB phone-photo bloat and normalises EXIF
// rotation so nothing shows up sideways.
// ---------------------------------------------------------------------------

/** Longest edge of a stored photo, in pixels. */
const MAX_DIMENSION = 2000;

/** JPEG quality for the re-encode. 0.85 is visually clean and much smaller. */
const JPEG_QUALITY = 0.85;

/** Anything under this that's already a normal web image is left alone. */
const PASSTHROUGH_MAX_BYTES = 1_200_000;

export function isHeic(file: File): boolean {
  return (
    /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
  );
}

function jpegName(original: string): string {
  const base = original.replace(/\.[^.]+$/, "");
  return `${base || "photo"}.jpg`;
}

/** Native decode. Returns null instead of throwing so callers can fall through. */
async function decodeWithBitmap(blob: Blob): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    // from-image applies EXIF rotation so portrait shots aren't sideways.
    return await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    try {
      // Some older browsers reject the options object but can still decode.
      return await createImageBitmap(blob);
    } catch {
      return null;
    }
  }
}

/** Decode via an <img> tag. Covers Safari versions without createImageBitmap. */
function decodeWithImgTag(blob: Blob): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** Last resort: the WebAssembly HEIC decoder. */
async function decodeWithHeic2any(file: File): Promise<Blob | null> {
  try {
    const heic2any = (await import("heic2any")).default;
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    return Array.isArray(result) ? result[0] : (result as Blob);
  } catch {
    return null;
  }
}

function scaledSize(width: number, height: number) {
  const longest = Math.max(width, height);
  if (longest <= MAX_DIMENSION) return { width, height };
  const ratio = MAX_DIMENSION / longest;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", JPEG_QUALITY)
  );
}

async function redraw(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  name: string
): Promise<File | null> {
  const size = scaledSize(width, height);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, size.width, size.height);

  const blob = await canvasToJpeg(canvas);
  if (!blob) return null;

  return new File([blob], jpegName(name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

/**
 * Converts and shrinks a picked file. Throws with a readable message only when
 * every decode path has failed, so the caller can show it to the user.
 */
export async function prepareImage(file: File): Promise<File> {
  const heic = isHeic(file);

  // A modest JPEG or PNG needs nothing done to it.
  if (!heic && file.size <= PASSTHROUGH_MAX_BYTES) return file;

  // 1 + 2: try to decode the original directly.
  const bitmap = await decodeWithBitmap(file);
  if (bitmap) {
    const out = await redraw(bitmap, bitmap.width, bitmap.height, file.name);
    bitmap.close?.();
    if (out) return out;
  }

  const img = await decodeWithImgTag(file);
  if (img && img.naturalWidth > 0) {
    const out = await redraw(
      img,
      img.naturalWidth,
      img.naturalHeight,
      file.name
    );
    if (out) return out;
  }

  // 3: HEIC that this browser genuinely cannot read on its own.
  if (heic) {
    const converted = await decodeWithHeic2any(file);
    if (converted) {
      const convertedBitmap = await decodeWithBitmap(converted);
      if (convertedBitmap) {
        const out = await redraw(
          convertedBitmap,
          convertedBitmap.width,
          convertedBitmap.height,
          file.name
        );
        convertedBitmap.close?.();
        if (out) return out;
      }
      // Decoded but couldn't be redrawn — ship the converted JPEG as-is.
      return new File([converted], jpegName(file.name), {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
    }

    throw new Error(
      `"${file.name}" is an iPhone HEIC photo this browser can't read. On your iPhone, Settings › Camera › Formats › Most Compatible makes new photos upload anywhere, or share the photo to yourself first and it'll come through as a JPEG.`
    );
  }

  // Not HEIC, just big, and we couldn't re-encode it. Upload the original.
  return file;
}
