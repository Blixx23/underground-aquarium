import "server-only";
import { createPrivateKey, sign } from "node:crypto";

/**
 * Sends Android push notifications through Firebase Cloud Messaging (HTTP v1).
 * The Android twin of lib/push/apns.ts.
 *
 * Needs three settings in Vercel, all from the Firebase service account key
 * (Firebase console > Project settings > Service accounts > Generate new key):
 *  - FCM_PROJECT_ID    project_id
 *  - FCM_CLIENT_EMAIL  client_email
 *  - FCM_PRIVATE_KEY   private_key (BEGIN/END lines included)
 */

export function fcmConfigured(): boolean {
  return Boolean(process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY);
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// Google's access tokens last an hour; reuse one for 50 minutes.
let cached: { token: string; until: number } | null = null;

async function accessToken(): Promise<string> {
  const now = Date.now();
  if (cached && now < cached.until) return cached.token;
  const iat = Math.floor(now / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: process.env.FCM_CLIENT_EMAIL,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      iat,
      exp: iat + 3600,
    })
  );
  const pem = (process.env.FCM_PRIVATE_KEY ?? "").replace(/\\n/g, "\n").trim();
  const signature = sign("RSA-SHA256", Buffer.from(`${header}.${claims}`), createPrivateKey(pem));
  const assertion = `${header}.${claims}.${b64url(signature)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  const data = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !data.access_token) throw new Error(`Google sign-in for push failed: ${data.error ?? res.status}`);
  cached = { token: data.access_token, until: now + 50 * 60 * 1000 };
  return data.access_token;
}

export type FcmResult = { ok: true } | { ok: false; gone: true; reason: string } | { ok: false; reason: string };

export async function sendFcm(
  deviceToken: string,
  msg: { title: string; body?: string | null; link?: string | null; group?: string }
): Promise<FcmResult> {
  try {
    const token = await accessToken();
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID}/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title: msg.title, ...(msg.body ? { body: msg.body } : {}) },
          data: { ...(msg.link ? { link: msg.link } : {}) },
          android: {
            priority: "high",
            notification: { tag: msg.group ?? "general", color: "#22d3ee" },
          },
        },
      }),
    });
    if (res.ok) return { ok: true };
    const err = (await res.json().catch(() => ({}))) as {
      error?: { status?: string; message?: string; details?: { errorCode?: string }[] };
    };
    const code = err.error?.details?.find((d) => d.errorCode)?.errorCode ?? err.error?.status ?? `HTTP ${res.status}`;
    // The app was uninstalled or the token is no good: forget the phone.
    if (res.status === 404 || code === "UNREGISTERED" || code === "INVALID_ARGUMENT") {
      return { ok: false, gone: true, reason: code };
    }
    return { ok: false, reason: `${code}: ${err.error?.message ?? ""}` };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "FCM failed" };
  }
}
