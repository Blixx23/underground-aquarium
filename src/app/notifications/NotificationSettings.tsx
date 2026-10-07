"use client";

import { useEffect, useMemo, useState } from "react";
import { Settings2, ChevronDown, Bell, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DIGEST_CHOICES, NOTIFICATION_GROUPS, type DigestChoice } from "@/lib/notificationGroups";

/**
 * What a member hears about, and where: the bell on the site, email, or both.
 * Each category has its own two switches, and email has an overall pace.
 */
export default function NotificationSettings({
  userId,
  initialMuted,
  initialEmailOff,
  initialDigest,
}: {
  userId: string;
  initialMuted: string[];
  initialEmailOff: string[];
  initialDigest: DigestChoice;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState<string[]>(initialMuted);
  const [emailOff, setEmailOff] = useState<string[]>(initialEmailOff);
  const [digest, setDigest] = useState<DigestChoice>(initialDigest);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // The gear in the bell, and the link in every email, open straight to this.
  useEffect(() => {
    if (window.location.hash === "#settings") setOpen(true);
    if (new URLSearchParams(window.location.search).get("emails") === "off") {
      setNotice("Notification emails are off. You'll still see everything under the bell. Turn them back on below anytime.");
    }
  }, []);

  async function save(patch: Record<string, unknown>, undo: () => void) {
    setError(null);
    const { error: e } = await supabase.from("profiles").update(patch).eq("id", userId);
    if (e) {
      undo();
      setError("Couldn't save that. Try again.");
    }
  }

  function toggleBell(types: string[]) {
    const isOn = !types.every((t) => muted.includes(t));
    const prev = muted;
    const next = isOn ? [...new Set([...muted, ...types])] : muted.filter((t) => !types.includes(t));
    setMuted(next);
    save({ muted_notifications: next }, () => setMuted(prev));
  }

  function toggleEmail(key: string) {
    const prev = emailOff;
    const next = emailOff.includes(key) ? emailOff.filter((k) => k !== key) : [...emailOff, key];
    setEmailOff(next);
    save({ email_off: next }, () => setEmailOff(prev));
  }

  function chooseDigest(d: DigestChoice) {
    const prev = digest;
    setDigest(d);
    setNotice(null);
    save({ email_digest: d }, () => setDigest(prev));
  }

  const emailsOn = digest !== "off";

  return (
    <div className="mb-6 rounded-2xl border border-ocean-800/60 bg-ocean-900/40">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left text-sm text-ocean-200 hover:text-white"
        aria-expanded={open}
      >
        <span className="inline-flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-ocean-400" />
          Choose what you hear about, on the site and by email
        </span>
        <ChevronDown className={`h-4 w-4 text-ocean-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-ocean-800/50 px-5 py-4">
          {notice && <p className="mb-3 rounded-lg bg-sky-500/10 px-3 py-2 text-sm text-sky-200">{notice}</p>}
          {error && <p className="mb-3 text-sm text-coral-300">{error}</p>}

          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ocean-400">Emails</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {DIGEST_CHOICES.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => chooseDigest(c.key)}
                aria-pressed={digest === c.key}
                className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  digest === c.key ? "border-emerald-500/60 bg-emerald-500/10" : "border-ocean-800 hover:border-ocean-600"
                }`}
              >
                <span className="block text-sm text-white">{c.label}</span>
                <span className="block text-xs text-ocean-400">{c.sub}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ocean-500">
            Messages, shop alerts and new tiers come right away. Everything else is bundled. You&apos;re only emailed about
            things you haven&apos;t already seen on the site.
          </p>

          <div className="mt-5 flex items-center justify-end gap-6 pr-1 text-[11px] font-semibold uppercase tracking-wide text-ocean-400">
            <span className="inline-flex w-11 justify-center" title="The bell on the site">
              <Bell className="h-4 w-4" />
            </span>
            <span className="inline-flex w-11 justify-center" title="Email">
              <Mail className="h-4 w-4" />
            </span>
          </div>
          <ul className="divide-y divide-ocean-800/40">
            {NOTIFICATION_GROUPS.map((g) => {
              const bellOn = g.bell === false ? true : !g.types.every((t) => muted.includes(t));
              const mailOn = emailsOn && !emailOff.includes(g.key);
              return (
                <li key={g.key} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-white">{g.label}</p>
                    <p className="text-xs text-ocean-500">{g.sub}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-6">
                    {g.bell === false ? (
                      <span className="w-11 text-center text-[10px] leading-tight text-ocean-500">Messages icon</span>
                    ) : (
                      <Switch on={bellOn} label={`${g.label} on the site`} onClick={() => toggleBell(g.types)} />
                    )}
                    <Switch
                      on={mailOn}
                      disabled={!emailsOn}
                      label={`${g.label} by email`}
                      onClick={() => toggleEmail(g.key)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="pt-2 text-xs text-ocean-600">
            {emailsOn
              ? "Notices about your own account always come through."
              : "Emails are set to Never, so the email switches are off. Pick As it happens or Once a day to use them."}
          </p>
        </div>
      )}
    </div>
  );
}

function Switch({ on, label, onClick, disabled = false }: { on: boolean; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-40 ${
        on ? "bg-ocean-500" : "bg-ocean-800"
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[22px]" : "translate-x-0.5"}`} />
    </button>
  );
}
