/**
 * Phone numbers as people typed them ("9167405101", "916.740.5101",
 * "+1 916 740 5101") shown one tidy way, "(916) 740-5101", with links that
 * start a call or a text. Numbers that aren't US-shaped are left as typed.
 */
function usDigits(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return d;
  if (d.length === 11 && d.startsWith("1")) return d.slice(1);
  return null;
}

export function formatPhone(raw: string): string {
  const d = usDigits(raw);
  if (!d) return raw.trim();
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function telHref(raw: string): string {
  const d = usDigits(raw);
  return d ? `tel:+1${d}` : `tel:${raw.replace(/[^\d+]/g, "")}`;
}

/** A text message, optionally with the first line already written. */
export function smsHref(raw: string, body?: string): string {
  const d = usDigits(raw);
  const to = d ? `+1${d}` : raw.replace(/[^\d+]/g, "");
  // "?&body=" is the form both iPhone and Android understand.
  return body ? `sms:${to}?&body=${encodeURIComponent(body)}` : `sms:${to}`;
}
