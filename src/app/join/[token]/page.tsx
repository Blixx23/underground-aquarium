"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Users, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function JoinPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const params = useParams();
  const token = Array.isArray(params.token)
    ? params.token[0]
    : (params.token as string);

  const [state, setState] = useState<
    "checking" | "joining" | "need-auth" | "error"
  >("checking");
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    let active = true;
    async function run() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;

      if (!user) {
        setState("need-auth");
        return;
      }

      setState("joining");
      const { data: slug, error: rpcErr } = await supabase.rpc("accept_invite", {
        p_token: token,
      });
      if (!active) return;

      if (rpcErr) {
        setError(rpcErr.message || "This invite couldn't be used.");
        setState("error");
        return;
      }
      if (!slug) {
        setError("This invite is no longer valid.");
        setState("error");
        return;
      }

      // Link any hand-added contacts that match this account's email.
      await supabase.rpc("claim_club_contacts");
      router.replace(`/c/${slug}`);
    }
    run();
    return () => {
      active = false;
    };
  }, [supabase, token, router]);

  return (
    <main className="min-h-screen pt-28 pb-20 px-6 flex items-center justify-center">
      <div className="w-full max-w-md text-center">
        {(state === "checking" || state === "joining") && (
          <>
            <Loader2 className="w-8 h-8 text-ocean-500 animate-spin mx-auto mb-4" />
            <p className="text-ocean-400">
              {state === "joining" ? "Joining the club…" : "Checking your invite…"}
            </p>
          </>
        )}

        {state === "need-auth" && (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-10">
            <Users className="w-10 h-10 text-ocean-400 mx-auto mb-4" />
            <h1 className="font-display text-2xl text-white mb-2">
              You&apos;re invited to a club
            </h1>
            <p className="text-ocean-400 mb-6">
              Sign in or create an account to accept your invitation. Already have
              an account? Logging in takes a second.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/login"
                className="inline-block px-6 py-3 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="inline-block px-6 py-3 rounded-xl border border-ocean-700/60 text-ocean-200 hover:bg-ocean-800/40 transition-colors"
              >
                Create account
              </Link>
            </div>
            <p className="text-xs text-ocean-600 mt-6">
              After signing in, open this invite link again to finish joining.
            </p>
          </div>
        )}

        {state === "error" && (
          <div className="rounded-2xl border border-coral-500/30 bg-coral-500/10 px-6 py-10">
            <AlertCircle className="w-10 h-10 text-coral-300 mx-auto mb-4" />
            <h1 className="font-display text-2xl text-white mb-2">
              Invite problem
            </h1>
            <p className="text-coral-200 mb-6">{error}</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors"
            >
              Go home
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
