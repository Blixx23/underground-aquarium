import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// heic-convert is a WebAssembly build of libheif and sharp is a native
// binary, so this has to be the Node runtime, not Edge.
export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Last-resort HEIC conversion for browsers that can't decode it themselves
 * (Chrome and Firefox, mainly — Safari handles HEIC natively and never gets
 * this far).
 *
 * Worth knowing: sharp alone cannot do this. Its prebuilt binary reads HEIC
 * headers but has no HEVC decoder, so it reports the right dimensions and then
 * fails on the pixels. heic-convert carries its own decoder, which is why it's
 * doing the decode and sharp only handles the resize afterwards.
 */

// Vercel caps a serverless request body at roughly 4.5MB. A 12MP iPhone HEIC
// is usually 2–3MB, so this is generous but honest about the ceiling.
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 85;

export async function POST(request: Request) {
  // Signed-in only. This endpoint burns real CPU, so it isn't open to the world.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: "Please sign in before uploading photos." },
      { status: 401 }
    );
  }

  let file: File;
  try {
    const form = await request.formData();
    const candidate = form.get("file");
    if (!(candidate instanceof File)) {
      return NextResponse.json({ error: "No photo received." }, { status: 400 });
    }
    file = candidate;
  } catch {
    return NextResponse.json(
      { error: "That photo was too large to upload for conversion." },
      { status: 413 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error:
          "That photo is too large to convert here. Email it to yourself first and it'll arrive as a JPEG.",
      },
      { status: 413 }
    );
  }

  const input = Buffer.from(await file.arrayBuffer());

  let jpeg: Buffer;
  try {
    const convert = (await import("heic-convert")).default;
    const decoded = await convert({
      buffer: input,
      format: "JPEG",
      quality: 0.92,
    });
    jpeg = Buffer.from(decoded);
  } catch (err) {
    console.error("HEIC convert failed:", err);
    return NextResponse.json(
      { error: "That photo couldn't be converted. Try a JPG or PNG instead." },
      { status: 422 }
    );
  }

  // Now that it's a JPEG, sharp can shrink it and bake in EXIF rotation.
  let out: Buffer;
  try {
    const sharp = (await import("sharp")).default;
    out = await sharp(jpeg)
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  } catch (err) {
    // Resizing is a nice-to-have. A big JPEG beats no photo at all.
    console.error("Resize after HEIC convert failed:", err);
    out = jpeg;
  }

  return new NextResponse(new Uint8Array(out), {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
