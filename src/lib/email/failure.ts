/**
 * One place decides what a send failure means. The worker uses it to
 * decide whether to retry; the watchdog uses it to decide what to call
 * the problem. If those two ever disagree, the alert says "bad address"
 * about something the queue is still retrying.
 */
export type FailureKind = "address" | "rate" | "provider" | "other";

export type Classified = {
  kind: FailureKind;
  /** Permanent: don't retry, and add the address to the suppression list. */
  permanent: boolean;
  message: string;
};

function statusOf(err: unknown): number | null {
  const e = err as { statusCode?: number; status?: number; name?: string; message?: string } | null;
  if (!e) return null;
  if (typeof e.statusCode === "number") return e.statusCode;
  if (typeof e.status === "number") return e.status;
  const m = /\b(4\d\d|5\d\d)\b/.exec(String(e.message ?? ""));
  return m ? Number(m[1]) : null;
}

export function classify(err: unknown): Classified {
  const raw = err as { name?: string; message?: string } | null;
  const message = String(raw?.message ?? raw ?? "Unknown error").slice(0, 500);
  const name = String(raw?.name ?? "").toLowerCase();
  const text = `${name} ${message}`.toLowerCase();
  const status = statusOf(err);

  // A bad address is bad forever. Everything else is worth another go.
  if (
    status === 400 ||
    status === 403 ||
    status === 404 ||
    status === 422 ||
    text.includes("validation_error") ||
    text.includes("invalid_to") ||
    text.includes("invalid email") ||
    text.includes("not a valid email")
  ) {
    return { kind: "address", permanent: true, message };
  }
  if (status === 429 || text.includes("rate_limit") || text.includes("too many requests")) {
    return { kind: "rate", permanent: false, message };
  }
  if (status !== null && status >= 500) {
    return { kind: "provider", permanent: false, message };
  }
  // Missing or rotated API key, network blip, anything unknown: retry.
  // A key is fixed in minutes; burning the queue over it is the worse outcome.
  return { kind: "other", permanent: false, message };
}

/** Growing backoff with jitter, so a rate-limited batch doesn't re-cluster. */
export function backoffMs(attempts: number): number {
  const base = Math.min(2 ** attempts * 60_000, 6 * 60 * 60_000); // 2m, 4m, 8m … capped at 6h
  return Math.round(base * (0.75 + Math.random() * 0.5));
}
