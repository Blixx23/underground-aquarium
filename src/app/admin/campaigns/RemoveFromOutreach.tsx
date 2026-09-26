"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MailX } from "lucide-react";

type Result = {
  ok?: boolean;
  error?: string;
  addresses?: string[];
  shops?: string[];
  stopped?: number;
  cancelled?: number;
};

/**
 * For the "please take me off" replies. Paste the address (or just the
 * shop's domain to catch every address it has) and it never hears from
 * us again. Its page in the directory stays up.
 */
export default function RemoveFromOutreach() {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  async function remove() {
    if (!target.trim()) return;
    setBusy(true);
    setNote(null);
    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-outreach", target }),
    });
    const r = (await res.json()) as Result;
    setBusy(false);
    if (r.error) {
      setNote({ tone: "bad", text: r.error });
      return;
    }
    const who = r.shops?.length ? r.shops.join(", ") : r.addresses?.join(", ");
    const extra = r.cancelled ? ` Cancelled ${r.cancelled} waiting email${r.cancelled === 1 ? "" : "s"}.` : "";
    setNote({
      tone: "ok",
      text: `Done. ${who} won't get outreach again (${r.addresses?.length ?? 0} address${r.addresses?.length === 1 ? "" : "es"} blocked).${extra} Their page stays in the directory.`,
    });
    setTarget("");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-ocean-800/60 bg-ocean-950/40 p-5">
      <h2 className="flex items-center gap-2 text-base font-semibold text-white">
        <MailX className="h-4 w-4 text-amber-300" />
        Remove from outreach
      </h2>
      <p className="mt-1 text-sm text-ocean-400">
        For shops that reply asking to stop. Paste their email, or just their domain to cover every address they use.
        They won&apos;t get another campaign email. Their shop page stays up.
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
          disabled={busy || !target.trim()}
          className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-400/20 disabled:opacity-40"
        >
          {busy ? "Removing…" : "Remove"}
        </button>
      </form>
      {note && (
        <p
          className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
            note.tone === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              : "border-red-500/30 bg-red-500/10 text-red-200"
          }`}
        >
          {note.text}
        </p>
      )}
    </div>
  );
}
