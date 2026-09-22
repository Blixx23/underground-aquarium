import "server-only";
import { timingSafeEqual } from "node:crypto";

/**
 * A missing secret is a refusal, never a bypass. Compared in constant
 * time so the header can't be guessed a character at a time.
 */
export function cronAuthorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const want = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  return want.length === got.length && timingSafeEqual(want, got);
}
