"use client";

/**
 * Calls /api/admin/moderate from a forum page. If the admin area isn't
 * unlocked on this device yet, it asks for the admin password right there,
 * unlocks (the same /api/admin-unlock the /admin page uses) and carries on
 * with what was clicked, instead of sending the admin off to /admin first.
 * Unlocking lasts as long as it does from /admin, so it's asked once per device.
 */
export async function moderate(payload: Record<string, unknown>): Promise<{ ok?: boolean; redirect?: string; error?: string }> {
  const call = async () => {
    const res = await fetch("/api/admin/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; redirect?: string; error?: string; locked?: boolean };
    return { res, data };
  };

  let { res, data } = await call();
  if ((res.status === 401 || res.status === 403) && data.locked) {
    const password = window.prompt("Admin password (asked once on this device):");
    if (!password) return { error: "Cancelled." };
    const unlock = await fetch("/api/admin-unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const u = (await unlock.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!u.ok) return { error: u.error ?? "That password isn't right." };
    ({ res, data } = await call());
  }
  if (!res.ok) return { error: data.error ?? "Couldn't do that." };
  return data;
}
