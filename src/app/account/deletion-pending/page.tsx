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
  // Reactivated, but we couldn't tell which tanks to make public again.
  const [done, setDone] = useState(false);

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
    // The server clears the deletion and puts back tanks that were public,
    // which the browser can't do on its own because the list of those tanks
    // is kept where only the server can read and clear it.
    try {
      const res = await fetch("/api/account/reactivate", { method: "POST" });
      const data = await res.json();
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setError(data?.error || "Couldn't cancel deletion. Please try again.");
        setBusy(null);
        return;
      }
      if (data.tanksTracked === false) {
        // Older deletion with no saved list: we can't tell which tanks were
        // public, so say so instead of guessing.
        setDone(true);
        setBusy(null);
        return;
      }
      router.refresh();
      router.push("/profile");
    } catch {
      setError("Couldn't cancel deletion. Please try again.");
      setBusy(null);
    }
  }

  async function signOut() {
    setBusy("signout");
    await supabase.auth.signOut();
    // Full page load so nothing rendered while signed in is reused.
    window.location.replace("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 pt-20">
        <Loader2 className="h-6 w-6 animate-spin text-ocean-500" />
      </main>
    );
  }

  if (done) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 pt-20 pb-20">
        <div className="w-full max-w-md rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-8 text-center">
          <h1 className="mb-2 font-display text-2xl text-white">
            Welcome back
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-ocean-300">
            Your account is active again. Your tanks are still private,
            because we couldn&apos;t tell which ones were public before. Open
            each tank in the Tank Builder to make it public again. Classified
            ads you had live are marked expired, and you can repost them from
            My listings.
          </p>
          <button
            onClick={() => {
              router.refresh();
              router.push("/profile");
            }}
            className="inline-flex w-full items-center justify-center rounded-lg bg-ocean-500 px-4 py-2.5 font-medium text-white transition hover:bg-ocean-400"
          >
            Go to my profile
          </button>
        </div>
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
          Reactivating restores your account and makes your tanks that were
          public visible again. Classified ads you had live were marked
          expired, so repost the ones you still want from My listings.
        </p>
      </div>
    </main>
  );
}
