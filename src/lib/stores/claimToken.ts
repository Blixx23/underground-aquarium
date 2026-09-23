import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A signed link that lets a shop start claiming its page from the email
 * we sent to that shop's own published address.
 *
 * It is not a login and it grants nothing on its own. It says one thing:
 * whoever is holding this opened mail sent to the address this shop
 * publishes on its own website. They still sign in, and you still
 * approve the claim. What it removes is the part where a busy shop owner
 * has to find the right page, find the button, and write a paragraph
 * proving who they are.
 */
function secret(): string {
  return process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "dev";
}

export function claimToken(storeId: string): string {
  return createHmac("sha256", secret()).update(`claim:${storeId}`).digest("hex").slice(0, 32);
}

export function validClaimToken(storeId: string, token: string): boolean {
  const want = Buffer.from(claimToken(storeId));
  const got = Buffer.from(String(token || ""));
  return want.length === got.length && timingSafeEqual(want, got);
}
