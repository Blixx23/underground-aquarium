/**
 * Event times are stored as instants (timestamptz) plus the event's own
 * time zone. Forms edit them as wall-clock time *in that zone*, so a
 * 9:30am Ohio auction still reads 9:30am when edited from California.
 */

export const DEFAULT_EVENT_TZ = "America/Los_Angeles";
export const DEFAULT_EVENT_IMAGE = "/event-default.png";

export const US_TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
];

function wallParts(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), mo: get("month"), d: get("day"), h: get("hour") % 24, mi: get("minute") };
}

/** ISO instant → "YYYY-MM-DDTHH:mm" as the clock reads in `tz`. */
export function isoToZonedInput(iso: string | null, tz: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "";
  const p = wallParts(date, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.y}-${pad(p.mo)}-${pad(p.d)}T${pad(p.h)}:${pad(p.mi)}`;
}

/** "YYYY-MM-DDTHH:mm" read as the clock in `tz` → ISO instant. */
export function zonedInputToIso(local: string, tz: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const [y, mo, d, h, mi] = m.slice(1).map(Number);
  const target = Date.UTC(y, mo - 1, d, h, mi);
  // Guess, see what the zone's clock says, correct by the difference. Twice covers DST edges.
  let guess = target;
  for (let i = 0; i < 2; i++) {
    const p = wallParts(new Date(guess), tz);
    const seen = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
    guess += target - seen;
  }
  return new Date(guess).toISOString();
}

export function tzLabel(tz: string): string {
  return US_TIMEZONES.find((z) => z.value === tz)?.label ?? tz.replace(/_/g, " ");
}
