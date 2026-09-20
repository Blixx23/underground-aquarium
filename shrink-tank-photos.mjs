/**
 * Shrink tank photos that went up at full camera size.
 *
 *   node --env-file=.env.local shrink-tank-photos.mjs           # see what it would do
 *   node --env-file=.env.local shrink-tank-photos.mjs --write   # actually do it
 *
 * Some early uploads skipped the in-browser resize, so a phone photo lands
 * as a 24-megapixel, multi-megabyte file that crawls on a phone and gets
 * cropped oddly. This finds any tank photo bigger than it needs to be,
 * straightens it using the camera's rotation tag, resizes it to 2048px on
 * the long edge, uploads the smaller copy, and points the tank at it.
 *
 * The original file is left in storage, untouched, so nothing is lost.
 */
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Check .env.local.");
  process.exit(1);
}
const supabase = createClient(url, key);
const WRITE = process.argv.includes("--write");

const BUCKET = "tank-photos";
const MAX_EDGE = 2048;
const MAX_BYTES = 1.2 * 1024 * 1024;
const marker = `/storage/v1/object/public/${BUCKET}/`;

const mb = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

async function main() {
  const { data: tanks, error } = await supabase
    .from("tanks")
    .select("id, name, user_id, images")
    .not("images", "is", null);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  let fixed = 0;
  let fine = 0;
  let saved = 0;

  for (const tank of tanks ?? []) {
    const images = Array.isArray(tank.images) ? tank.images : [];
    if (!images.length) continue;
    const next = [...images];
    let changed = false;

    for (let i = 0; i < images.length; i++) {
      const src = images[i];
      const at = src.indexOf(marker);
      if (at < 0) {
        fine++;
        continue; // not one of ours
      }
      const res = await fetch(src);
      if (!res.ok) {
        console.log(`  ${tank.name}: couldn't fetch photo ${i + 1} (${res.status})`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const meta = await sharp(buf).metadata();
      const edge = Math.max(meta.width ?? 0, meta.height ?? 0);
      const rotated = (meta.orientation ?? 1) !== 1;

      if (edge <= MAX_EDGE && buf.length <= MAX_BYTES && !rotated) {
        fine++;
        continue;
      }

      const out = await sharp(buf)
        .rotate() // apply the camera's rotation tag, then drop it
        .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 84, mozjpeg: true })
        .toBuffer();
      const outMeta = await sharp(out).metadata();

      console.log(
        `${tank.name} · photo ${i + 1}: ${meta.width}×${meta.height} ${mb(buf.length)}` +
          ` → ${outMeta.width}×${outMeta.height} ${mb(out.length)}${rotated ? " (straightened)" : ""}`
      );
      saved += buf.length - out.length;
      fixed++;

      if (WRITE) {
        const path = `${tank.user_id}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, out, { contentType: "image/jpeg" });
        if (upErr) {
          console.log(`  upload failed: ${upErr.message}`);
          continue;
        }
        next[i] = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        changed = true;
      }
    }

    if (WRITE && changed) {
      const { error: updErr } = await supabase.from("tanks").update({ images: next }).eq("id", tank.id);
      if (updErr) console.log(`  couldn't update ${tank.name}: ${updErr.message}`);
    }
  }

  console.log(
    `\n${WRITE ? "Shrank" : "Would shrink"} ${fixed} photo${fixed === 1 ? "" : "s"}, saving ${mb(saved)}. ` +
      `${fine} already fine.`
  );
  if (!WRITE && fixed) console.log("Nothing was changed. Add --write to do it.");
}

main();
