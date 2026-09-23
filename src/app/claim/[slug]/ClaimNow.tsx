"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/**
 * The whole claim, in one button. The verification already happened:
 * they opened mail sent to the address this shop publishes. All that is
 * left is to record who they are.
 */
export default function ClaimNow({
  storeId,
  storeName,
  contactEmail,
}: {
  storeId: string;
  storeName: string;
  contactEmail: string | null;
}) {
  const [supabase] = useState(() => createClient());
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setBusy(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBusy(false);
      setError("Your session expired. Sign in again and the link will still work.");
      return;
    }
    const { error: insertError } = await supabase.from("store_claims").insert({
      store_id: storeId,
      user_id: user.id,
      contact_email: contactEmail,
      proof: `Opened the claim link emailed to ${contactEmail ?? "the shop's listed address"}.`,
      status: "pending",
    });
    setBusy(false);
    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "You've already asked to claim this shop. I'll get to it shortly."
          : "Something went wrong. Reply to the email and I'll sort it out by hand."
      );
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
        <p className="font-medium text-white">That&apos;s it, {storeName} is yours.</p>
        <p className="mt-1 text-sm text-emerald-100/80">
          I check these by hand, usually the same day. You&apos;ll get an email the moment it&apos;s
          approved, and then the page is yours to edit.
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={claim}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 text-base font-semibold text-ocean-950 transition-colors hover:bg-emerald-400 disabled:opacity-50"
      >
        <ShieldCheck className="h-5 w-5" />
        {busy ? "One moment…" : `Yes, I work at ${storeName}`}
      </button>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </div>
  );
}
