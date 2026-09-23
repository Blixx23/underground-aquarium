import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock, Camera, MessageSquare, Eye } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { validClaimToken } from "@/lib/stores/claimToken";
import ClaimNow from "./ClaimNow";

export const metadata: Metadata = { title: "Claim your shop", robots: { index: false } };
export const dynamic = "force-dynamic";

type Store = {
  id: string; slug: string; name: string; city: string | null; state: string | null;
  hours: string | null; description: string | null; claimed_by: string | null;
};

/**
 * Where the emailed claim link lands. The shop is already identified and
 * already vouched for by the token, so there is nothing to fill in: sign
 * in, press the button, done.
 */
export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { slug } = await params;
  const { t } = await searchParams;

  const { data } = await supabaseAdmin
    .from("fish_stores")
    .select("id, slug, name, city, state, hours, description, claimed_by")
    .eq("slug", slug)
    .maybeSingle();
  const store = data as Store | null;
  if (!store) notFound();

  // No token, or the wrong one: send them to the normal page, which has
  // the ordinary claim form on it.
  if (!t || !validClaimToken(store.id, t)) {
    return (
      <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="font-display text-2xl text-white">That link has expired</h1>
          <p className="mt-2 text-ocean-400">
            No harm done. You can still claim {store.name} from its page.
          </p>
          <Link
            href={`/stores/${store.slug}#claim`}
            className="mt-6 inline-block rounded-xl bg-ocean-700 px-5 py-3 text-sm font-medium text-white hover:bg-ocean-600"
          >
            Go to {store.name}
          </Link>
        </div>
      </main>
    );
  }

  if (store.claimed_by) {
    return (
      <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-lg text-center">
          <BadgeCheck className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
          <h1 className="font-display text-2xl text-white">{store.name} is already claimed</h1>
          <p className="mt-2 text-ocean-400">
            Someone from the shop is managing this page. If that wasn&apos;t you and it should
            have been, reply to the email I sent and I&apos;ll sort it out.
          </p>
        </div>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: contact } = await supabaseAdmin
    .from("store_contacts")
    .select("email")
    .eq("store_id", store.id)
    .maybeSingle();
  const contactEmail = (contact as { email: string | null } | null)?.email ?? null;

  const next = encodeURIComponent(`/claim/${store.slug}?t=${t}`);
  const gaps = [
    !store.hours && { Icon: Clock, text: "Your hours aren't listed" },
    !store.description && { Icon: MessageSquare, text: "There's nothing written about the shop" },
  ].filter(Boolean) as { Icon: typeof Clock; text: string }[];

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-xl">
        <p className="mb-3 font-mono text-[11px] uppercase tracking-widest text-emerald-400">
          Claim your shop
        </p>
        <h1 className="font-display text-3xl text-white">{store.name}</h1>
        <p className="mt-1 text-ocean-400">
          {[store.city, store.state].filter(Boolean).join(", ")}
        </p>

        <div className="mt-8 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-6">
          {user ? (
            <>
              <p className="mb-1 font-medium text-white">One press and it&apos;s yours.</p>
              <p className="mb-5 text-sm text-ocean-400">
                You&apos;re signed in as {user.email}. I already know this link went to{" "}
                {contactEmail ?? "the address this shop publishes"}, so there&apos;s nothing for
                you to prove.
              </p>
              <ClaimNow storeId={store.id} storeName={store.name} contactEmail={contactEmail} />
            </>
          ) : (
            <>
              <p className="mb-1 font-medium text-white">Sign in and it&apos;s yours.</p>
              <p className="mb-5 text-sm text-ocean-400">
                One account, free, about thirty seconds. This link keeps working, so you&apos;ll
                land right back here.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/register?next=${next}`}
                  className="rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-ocean-950 hover:bg-emerald-400"
                >
                  Create an account
                </Link>
                <Link
                  href={`/login?next=${next}`}
                  className="rounded-xl border border-ocean-700 px-5 py-3 text-sm text-ocean-200 hover:text-white"
                >
                  I already have one
                </Link>
              </div>
            </>
          )}
        </div>

        {gaps.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5">
            <p className="mb-3 text-sm font-medium text-amber-100">
              What you can fix the moment it&apos;s approved
            </p>
            <ul className="space-y-2">
              {gaps.map((g) => (
                <li key={g.text} className="flex items-center gap-2.5 text-sm text-amber-100/80">
                  <g.Icon className="h-4 w-4 shrink-0" />
                  {g.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            { Icon: Camera, t: "Post what came in", s: "Shipments show up in the feed" },
            { Icon: MessageSquare, t: "Answer reviews", s: "In your own words" },
            { Icon: Eye, t: "See who's looking", s: "Views, follows, questions" },
          ].map((c) => (
            <div key={c.t} className="rounded-xl border border-ocean-800/60 bg-ocean-900/30 p-4">
              <c.Icon className="mb-2 h-4 w-4 text-ocean-400" />
              <p className="text-sm font-medium text-white">{c.t}</p>
              <p className="mt-0.5 text-xs text-ocean-500">{c.s}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-ocean-600">
          Free, and it stays free.{" "}
          <Link href={`/stores/${store.slug}`} className="underline hover:text-ocean-400">
            See the page first
          </Link>
        </p>
      </div>
    </main>
  );
}
