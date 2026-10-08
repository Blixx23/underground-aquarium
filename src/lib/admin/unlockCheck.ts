import "server-only";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, adminGateEnabled, validUnlockToken } from "@/lib/admin/unlock";

/**
 * For admin powers used outside /admin (editing someone's shop, moderating
 * a forum post): true only when this admin has entered the admin password
 * on this device. Always true while ADMIN_PASSWORD isn't set.
 */
export async function adminUnlocked(userId: string): Promise<boolean> {
  if (!adminGateEnabled()) return true;
  const jar = await cookies();
  return validUnlockToken(jar.get(ADMIN_COOKIE)?.value, userId);
}

export const LOCKED_MESSAGE = "Unlock the admin area first (open /admin and enter the admin password).";
