"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DeletionPendingPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(true);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "cancel" | "signout">(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("deleted_at, deletion_scheduled_for")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile?.deleted_at) {
        router.replace("/profile");
        return;
      }
      setScheduledFor(profile.deletion_scheduled_for ?? null);
      setLoading(false);
    })();
  }, [supabase, router]);

  async function cancelDeletion() {
    setBusy("cancel");
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    const { error: e } = await supabase
      .from("profiles")
      .update({ deleted_at: null, deletion_scheduled_for: null })
      .eq("id", user.id);
    if (e) {
      setError("Couldn't cancel deletion. Please try again.");
      setBusy(null);
      return;
    }
    router.refresh();
    router.push("/profile");
  }

  async function signOut() {
    setBusy("signout");
    await supabase.auth.signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-ocean-500" />
      </main>
    );
  }

  const when = scheduledFor
    ? new Date(scheduledFor).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pt-20 pb-20">
      <div className="w-full max-w-md rounded-2xl border border-coral-500/30 bg-coral-500/5 p-8">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-coral-500/15 text-coral-300">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-center font-display text-2xl text-white">
          Account scheduled for deletion
        </h1>
        <p className="mb-6 text-center text-sm leading-relaxed text-ocean-300">
          {when ? (
            <>
              Your account is set to be permanently deleted on{" "}
              <span className="font-medium text-white">{when}</span>. Until then
              you can cancel and reactivate it.
            </>
          ) : (
            <>
              Your account is scheduled for deletion. You can cancel and
              reactivate it below.
            </>
          )}
        </p>

        {error && (
          <p className="mb-4 rounded-lg border border-coral-500/40 bg-coral-500/10 px-4 py-2 text-sm text-coral-200">
            {error}
          </p>
        )}

        <button
          onClick={cancelDeletion}
          disabled={busy !== null}
          className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ocean-500 px-4 py-2.5 font-medium text-white transition hover:bg-ocean-400 disabled:opacity-50"
        >
          {busy === "cancel" && <Loader2 className="h-4 w-4 animate-spin" />}
          Cancel deletion &amp; reactivate
        </button>
        <button
          onClick={signOut}
          disabled={busy !== null}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-ocean-700/60 px-4 py-2.5 text-sm text-ocean-200 transition hover:text-white hover:border-ocean-600 disabled:opacity-50"
        >
          {busy === "signout" && <Loader2 className="h-4 w-4 animate-spin" />}
          Sign out
        </button>

        <p className="mt-5 text-center text-xs text-ocean-500">
          Reactivating restores your account, but listings you had live were
          hidden — you can re-publish them from your Seller Hub.
        </p>
      </div>
    </main>
  );
}
