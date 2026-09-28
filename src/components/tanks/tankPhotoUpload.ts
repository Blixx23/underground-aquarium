import type { SupabaseClient } from "@supabase/supabase-js";
import { isImageFile, prepareImage, uploadExtension } from "@/lib/images/prepareImage";
import { PHOTO_BUCKET } from "@/lib/tanks/showcase";

/**
 * One photo pipeline for tanks, shared by Tank Builder and the tank page's
 * Edit showcase, so both accept the same photos and give the same answers.
 *
 * The size limit is the smaller of the two the site used to have (10 MB).
 * The tank-photos storage bucket's own limit isn't recorded in the code, so
 * we can't promise the larger 15 MB would always be accepted.
 */
export const TANK_PHOTO_MAX_MB = 10;
export const TANK_PHOTO_MAX_BYTES = TANK_PHOTO_MAX_MB * 1024 * 1024;

export type TankPhotoResult = { url: string } | { error: string };

/**
 * Checks, converts (iPhone HEIC becomes JPEG, big photos are shrunk) and
 * uploads one photo. Returns the public URL, or a message to show the member.
 */
export async function uploadTankPhoto(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<TankPhotoResult> {
  if (!isImageFile(file)) return { error: "Photos only, please." };
  if (file.size > TANK_PHOTO_MAX_BYTES) {
    return { error: `That photo is too large (max ${TANK_PHOTO_MAX_MB} MB).` };
  }

  // Same converter the feed uses. Before this, a HEIC that Chrome or Firefox
  // couldn't read was uploaded raw, and then showed up blank on the page.
  let ready: File;
  try {
    ready = await prepareImage(file);
  } catch (err) {
    return {
      error:
        err instanceof Error && err.message
          ? err.message
          : "That photo couldn't be read. Try a different one.",
    };
  }

  const path = `${userId}/${crypto.randomUUID()}.${uploadExtension(ready)}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, ready, { contentType: ready.type || "image/jpeg" });
  if (error) return { error: "A photo didn't upload. Try that one again." };

  return { url: supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl };
}
