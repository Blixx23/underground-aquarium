"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, BadgeCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ClaimStore({
  storeId,
  storeName,
  claimed,
}: {
  storeId: string;
  storeName: string;
  claimed: boolean;
}) {
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [proof, setProof] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setCheckedAuth(true);
    });
  }, [open, supabase]);

  async function submit() {
    const trimmed = proof.trim();
    if (!trimmed || busy || !userId) return;
    setBusy(true);
    setError(null);
    try {
      const { error: insertError } = await supabase.from("store_claims").insert({
        store_id: storeId,
        user_id: userId,
        contact_email: email.trim() || null,
        proof: trimmed,
        status: "pending",
      });
      if (insertError) throw insertError;
      setDone(true);
    } catch {
      setError(
        "Couldn't submit your claim. You may have already requested this store."
      );
    } finally {
      setBusy(false);
    }
  }

  if (claimed) {
    return (
      <div className="mt-10 border-t border-white/10 pt-6 flex items-center gap-2 text-sm text-emerald-300">
        <BadgeCheck className="w-4 h-4" />
        This listing is managed by its owner.
      </div>
    );
  }

  if (done) {
    return (
      <div className="mt-10 border-t border-white/10 pt-6">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center">
          <p className="text-white font-medium mb-1">Claim submitted</p>
          <p className="text-ocean-400 text-sm">
            We&apos;ll verify your details and mark you as the owner of{" "}
            {storeName}.
          </p>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-10 border-t border-white/10 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-white font-medium">Own this store?</p>
          <p className="text-ocean-400 text-sm">
            Claim {storeName} to manage its listing.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors whitespace-nowrap"
        >
          <ShieldCheck className="w-4 h-4" /> Claim it
        </button>
      </div>
    );
  }

  if (checkedAuth && !userId) {
    return (
      <div className="mt-10 border-t border-white/10 pt-6">
        <p className="text-ocean-300 text-sm">
          <Link
            href="/login"
            className="text-emerald-400 hover:text-emerald-300 font-medium"
          >
            Sign in
          </Link>{" "}
          to claim this store.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 border-t border-white/10 pt-6">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
        <p className="text-white font-medium mb-1">Claim {storeName}</p>
        <p className="text-ocean-400 text-sm mb-4">
          Tell us how we can verify you run this shop and we&apos;ll review it.
        </p>
        <div className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Contact email (ideally on the store's domain)"
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
          />
          <textarea
            value={proof}
            onChange={(e) => setProof(e.target.value)}
            rows={3}
            placeholder="How can we verify you? e.g. a business email on the store's website, the shop phone number, or a link to your site or social where we can confirm."
            className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-ocean-400 focus:outline-none focus:border-emerald-500/40"
          />
          {error && <p className="text-xs text-red-300">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy || !proof.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 text-sm font-medium hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit claim"}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg border border-white/10 text-ocean-300 px-4 py-2.5 text-sm hover:text-white hover:border-white/20 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}