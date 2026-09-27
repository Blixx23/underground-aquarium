"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailX, Undo2, Copy, Check } from "lucide-react";

type RemoveResult = {
  error?: string;
  addresses?: string[];
  shops?: string[];
  cancelled?: number;
  hidden?: number;
  confirmed?: string[];
  confirmFailed?: string[];
};
type RestoreResult = { error?: string; shops?: { name: string; url: string; claimLink: string }[] };

async function post<T>(payload: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/admin/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return (await res.json()) as T;
}

function CopyLink({ url }: { url: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(url).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        });
      }}
      className="inline-flex items-center gap-1 rounded-md border border-ocean-700 px-2 py-0.5 text-xs text-ocean-200 hover:text-white"
    >
      {done ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {done ? "Copied" : "Copy claim link"}
    </button>
  );
}

/**
 * For the "please take me off" replies, and for the day one of them
 * comes back wanting to claim.
 */
export default function RemoveFromOutreach() {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [hidePage, setHidePage] = useState(false);
  const [confirm, setConfirm] = useState(true);
  const [busy, setBusy] = useState<"remove" | "restore" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removed, setRemoved] = useState<RemoveResult | null>(null);
  const [restored, setRestored] = useState<RestoreResult | null>(null);

  async function remove() {
    if (!target.trim()) return;
    setBusy("remove");
    setError(null);
    setRemoved(null);
    setRestored(null);
    const r = await post<RemoveResult>({ action: "remove-outreach", target, hidePage, confirm });
    setBusy(null);
    if (r.error) return setError(r.error);
    setRemoved(r);
    setTarget("");
    setHidePage(false);
    router.refresh();
  }

  async function restore() {
    if (!target.trim()) return;
    setBusy("restore");
    setError(null);
    setRemoved(null);
    setRestored(null);
    const r = await post<RestoreResult>({ action: "restore-shop", target });
    setBusy(null);
    if (r.error) return setError(r.error);
    setRestored(r);
    router.refresh();
  }

  const who = removed?.shops?.length ? removed.shops.join(", ") : removed?.addresses?.join(", ");

  return (
    <div className="rounded-2xl border border-ocean-800/60 bg-ocean-950/40 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <MailX className="h-4 w-4 text-amber-300" />
        Remove from outreach
      </h2>
      <p className="mt-1 text-sm text-ocean-400">
        For shops that reply asking to stop. Paste their email, or just their domain to cover every address they use.
        Shops that use the unsubscribe link in the email are handled automatically, confirmation included.
      </p>

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void remove();
        }}
      >
        <input
          type="text"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="sales@shop.com or shop.com"
          className="min-w-0 flex-1 rounded-lg border border-ocean-700 bg-ocean-900 px-3 py-2 text-base text-white placeholder:text-ocean-500 sm:text-sm"
        />
        <button
          type="submit"
          disabled={busy !== null || !target.trim()}
          className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-400/20 disabled:opacity-40"
        >
          {busy === "remove" ? "Removing…" : "Remove"}
        </button>
        <button
          type="button"
          onClick={() => void restore()}
          disabled={busy !== null || !target.trim()}
          title="They want to claim after all: put the page back and get a claim link to send them"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-ocean-700 px-4 py-2 text-sm text-ocean-200 hover:text-white disabled:opacity-40"
        >
          <Undo2 className="h-4 w-4" />
          {busy === "restore" ? "Restoring…" : "Bring back"}
        </button>
      </form>

      <div className="mt-3 space-y-2 text-sm">
        <label className="flex items-start gap-2 text-ocean-200">
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} className="mt-1" />
          <span>
            Send them a confirmation email
            <span className="block text-xs text-ocean-500">
              One line from you saying they&apos;ve been unsubscribed. Nothing else.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-ocean-200">
          <input type="checkbox" checked={hidePage} onChange={(e) => setHidePage(e.target.checked)} className="mt-1" />
          <span>
            Also hide their page
            <span className="block text-xs text-ocean-500">
              Only for shops that got an email promising to take the page down (the first batch). Otherwise leave it
              up. Claimed shops are never hidden.
            </span>
          </span>
        </label>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>
      )}

      {removed && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          <p>
            {[
              `Done. ${(who ?? "").trim()} won't get outreach emails again.`,
              removed.hidden ? "Their page is hidden." : "Their page stays up.",
              removed.cancelled ? `Cancelled ${removed.cancelled} waiting email${removed.cancelled === 1 ? "" : "s"}.` : "",
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
          {removed.confirmed && removed.confirmed.length > 0 && (
            <p className="mt-1">Confirmation sent to {removed.confirmed.join(", ")}.</p>
          )}
          {removed.confirmFailed && removed.confirmFailed.length > 0 && (
            <p className="mt-1 text-amber-200">
              The confirmation to {removed.confirmFailed.join(", ")} didn&apos;t send. Check the Email page. They&apos;re still
              off the list.
            </p>
          )}
        </div>
      )}

      {restored?.shops && (
        <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          <p>Back up and able to receive email again. Reply to them with their claim link:</p>
          <ul className="mt-2 space-y-1.5">
            {restored.shops.map((s) => (
              <li key={s.claimLink} className="flex flex-wrap items-center gap-2">
                <a href={s.url} target="_blank" rel="noreferrer" className="underline">
                  {s.name}
                </a>
                <CopyLink url={s.claimLink} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-emerald-300/80">They still won&apos;t get campaign emails. They&apos;re coming in on their own.</p>
        </div>
      )}
    </div>
  );
}
