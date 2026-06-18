"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Users, CheckCircle2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function NewClubPage() {
  const supabase = useMemo(() => createClient(), []);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [dues, setDues] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdName, setCreatedName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setUser(data.user);
      setCheckingAuth(false);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  function onNameChange(v: string) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Give your club a name.");
      return;
    }
    const finalSlug = (slug.trim() || slugify(name));
    if (!finalSlug) {
      setError("Enter a URL handle for your club.");
      return;
    }

    const duesCents = Math.max(0, Math.round((parseFloat(dues) || 0) * 100));

    setSubmitting(true);
    try {
      const { error: rpcError } = await supabase.rpc("create_club", {
        p_name: name.trim(),
        p_slug: finalSlug,
        p_description: description.trim() || null,
        p_city: city.trim() || null,
        p_state: state.trim() || null,
        p_dues_amount_cents: duesCents,
      });
      if (rpcError) {
        if (/duplicate|unique/i.test(rpcError.message)) {
          throw new Error("That URL handle is already taken — try another.");
        }
        throw rpcError;
      }
      setCreatedName(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the club.");
      setSubmitting(false);
    }
  }

  const inputClass =
    "w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors";

  if (checkingAuth) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-ocean-500 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <Users className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-white mb-2">Sign in</h1>
          <p className="text-ocean-400 mb-6">
            You need an account to start a club.
          </p>
          <Link
            href="/login"
            className="inline-block px-6 py-3 rounded-xl bg-ocean-700 text-white hover:bg-ocean-600 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  if (createdName) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto text-center py-16">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-5" />
          <h1 className="font-display text-3xl text-white mb-3">
            {createdName} is live
          </h1>
          <p className="text-ocean-400 mb-8">
            You&apos;re the owner. Your club&apos;s dashboard and admin console are
            the next thing we&apos;ll build — your club is saved and ready.
          </p>
          <Link
            href="/profile"
            className="inline-block px-6 py-3 rounded-xl bg-ocean-700 text-white hover:bg-ocean-600 transition-colors"
          >
            Back to profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-xl mx-auto">
        <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
          Clubs
        </p>
        <h1 className="font-display text-4xl text-white mb-3">Start a club</h1>
        <p className="text-ocean-400 mb-10">
          Create your club&apos;s home for members, dues, BAP/HAP, and auctions.
          You&apos;ll be the owner and can invite officers afterward.
        </p>

        {error && (
          <div className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-5 py-4 text-coral-300 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-ocean-300 mb-2">Club name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Sacramento Aquarium Society"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm text-ocean-300 mb-2">Club URL</label>
            <div className="flex items-center gap-1 rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 focus-within:border-ocean-500 transition-colors">
              <span className="text-ocean-500 shrink-0">/c/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="sacramento-aquarium-society"
                className="w-full bg-transparent text-white placeholder-ocean-600 focus:outline-none"
              />
            </div>
            <p className="text-xs text-ocean-500 mt-2">
              This is your club&apos;s web address. Letters, numbers, and dashes.
            </p>
          </div>

          <div>
            <label className="block text-sm text-ocean-300 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="A friendly community of freshwater and planted-tank keepers."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-ocean-300 mb-2">City (optional)</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Sacramento"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-ocean-300 mb-2">State (optional)</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="CA"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-ocean-300 mb-2">
              Annual dues (optional)
            </label>
            <div className="flex items-center gap-1 rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 focus-within:border-ocean-500 transition-colors">
              <span className="text-ocean-500 shrink-0">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={dues}
                onChange={(e) => setDues(e.target.value)}
                placeholder="25.00"
                className="w-full bg-transparent text-white placeholder-ocean-600 focus:outline-none"
              />
            </div>
            <p className="text-xs text-ocean-500 mt-2">
              What members pay to join. You can change this anytime, or leave it
              blank for a free club.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ocean-700 text-white font-medium hover:bg-ocean-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Creating…" : "Create club"}
          </button>
        </form>
      </div>
    </main>
  );
}
