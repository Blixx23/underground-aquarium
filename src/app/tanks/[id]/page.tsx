import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Wrench, Fish, CalendarDays, ImagePlus, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";
import ReportButton from "@/components/tanks/ReportButton";
import TankVoteControl from "@/components/tanks/TankVoteControl";
import TankComments from "@/components/tanks/TankComments";
import TankGallery from "@/components/tanks/TankGallery";
import TankShowcaseEditor from "@/components/tanks/TankShowcaseEditor";
import Avatar from "@/components/profile/Avatar";
import SocietySeal from "@/components/society/SocietySeal";
import { SPEC_FIELDS, cleanSpecs, runningFor, blurb } from "@/lib/tanks/showcase";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

type Tank = {
  id: string;
  user_id: string;
  name: string;
  gallons: number | null;
  items: { slug: string; qty: number }[] | null;
  images: string[] | null;
  is_public: boolean;
  updated_at: string;
  score: number | null;
  description: string | null;
  started_on: string | null;
  specs: unknown;
};

type SpeciesRow = {
  slug: string;
  common_name: string;
  scientific_name: string | null;
};

const BASE = "id,user_id,name,gallons,items,images,is_public,updated_at,score";
const SHOWCASE = `${BASE},description,started_on,specs`;

/** The showcase columns arrive with step 55; until then, show what there is. */
async function loadTank(client: Awaited<ReturnType<typeof createClient>>, id: string) {
  const full = await client.from("tanks").select(SHOWCASE).eq("id", id).maybeSingle();
  if (!full.error) return full.data as Tank | null;
  const basic = await client.from("tanks").select(BASE).eq("id", id).maybeSingle();
  if (basic.error || !basic.data) return null;
  return { ...(basic.data as object), description: null, started_on: null, specs: {} } as Tank;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const tank = await loadTank(await createClient(), id);
  if (!tank) return { title: "Community Tank" };
  const cover = tank.images?.[0];
  return {
    title: `${tank.name} — Community Tank`,
    description: blurb(tank.description, 160) ?? `${tank.name} on Underground Aquarium.`,
    openGraph: cover ? { images: [{ url: cover }] } : undefined,
    robots: tank.is_public ? undefined : { index: false, follow: false },
  };
}

export default async function TankPage({ params }: Params) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const t = await loadTank(supabase, id);
  if (!t) notFound();

  const items = Array.isArray(t.items) ? t.items : [];
  const images = Array.isArray(t.images) ? t.images : [];
  const specs = cleanSpecs(t.specs);
  const specRows = SPEC_FIELDS.filter((f) => specs[f.key]);
  const running = runningFor(t.started_on);
  const isOwner = !!user && user.id === t.user_id;
  const fishCount = items.reduce((n, it) => n + (Number(it.qty) || 0), 0);

  const slugs = items.map((it) => it.slug);
  let bySlug = new Map<string, SpeciesRow>();
  if (slugs.length > 0) {
    const { data: speciesRows } = await supabasePublic
      .from("species")
      .select("slug,common_name,scientific_name")
      .in("slug", slugs);
    bySlug = new Map(((speciesRows as SpeciesRow[]) ?? []).map((s) => [s.slug, s]));
  }

  const { data: commentRows } = await supabase
    .from("tank_comments")
    .select("id,user_id,body,created_at")
    .eq("tank_id", id)
    .order("created_at", { ascending: true });
  const commentList = (commentRows ?? []) as {
    id: string;
    user_id: string;
    body: string;
    created_at: string;
  }[];

  const authorIds = new Set(commentList.map((c) => c.user_id));
  if (user) authorIds.add(user.id);
  authorIds.add(t.user_id);
  let profileById = new Map<string, { username: string | null; name: string; avatar: string | null }>();
  if (authorIds.size > 0) {
    const { data: profs } = await supabasePublic
      .from("profiles")
      .select("id,username,full_name,avatar_url")
      .in("id", Array.from(authorIds));
    profileById = new Map(
      (
        (profs as {
          id: string;
          username: string | null;
          full_name: string | null;
          avatar_url: string | null;
        }[]) ?? []
      ).map((p) => [
        p.id,
        { username: p.username, name: p.full_name || p.username || "Aquarist", avatar: p.avatar_url },
      ])
    );
  }

  const initialComments = commentList.map((c) => {
    const prof = profileById.get(c.user_id);
    return {
      id: c.id,
      userId: c.user_id,
      authorName: prof?.name || "Aquarist",
      authorUsername: prof?.username ?? null,
      body: c.body,
      createdAt: c.created_at,
    };
  });
  const owner = profileById.get(t.user_id);
  const { data: ownerSeal } = await supabasePublic.rpc("society_members_among", {
    p_users: [t.user_id],
  });
  const ownerIsSociety = Array.isArray(ownerSeal) && ownerSeal.length > 0;
  const currentProfile = user ? profileById.get(user.id) : undefined;

  const facts = [
    t.gallons ? `${t.gallons} gallons` : null,
    `${items.length} ${items.length === 1 ? "species" : "species"}`,
    fishCount ? `${fishCount} ${fishCount === 1 ? "fish" : "fish"}` : null,
  ].filter(Boolean);

  return (
    <main className="min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <div className="mx-auto max-w-5xl">
        {/* Title block */}
        <header className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-emerald-400">
              Community tank
              {!t.is_public && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-ocean-300">
                  <Lock className="h-2.5 w-2.5" /> Only you can see this
                </span>
              )}
            </p>
            <h1 className="font-display text-3xl leading-tight text-white sm:text-5xl">{t.name}</h1>
            <p className="mt-2 text-sm text-ocean-300 sm:text-base">
              {facts.join(" · ")}
              {running && <span className="text-ocean-400"> · {running}</span>}
            </p>
          </div>
          {isOwner && user && (
            <div className="flex flex-wrap gap-2">
              <TankShowcaseEditor
                tankId={t.id}
                userId={user.id}
                initial={{
                  images,
                  description: t.description,
                  startedOn: t.started_on,
                  specs,
                }}
              />
              <Link
                href={`/tank-builder?tank=${t.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm text-ocean-200 transition-colors hover:bg-white/5"
              >
                <Fish className="h-4 w-4" /> Edit stock
              </Link>
            </div>
          )}
        </header>

        {/* Photos */}
        {images.length > 0 ? (
          <TankGallery images={images} name={t.name} />
        ) : isOwner ? (
          <div className="flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03] px-6 text-center">
            <ImagePlus className="h-8 w-8 text-ocean-500" />
            <p className="font-medium text-white">Show it off</p>
            <p className="max-w-sm text-sm text-ocean-400">
              Add up to 12 photos with Edit showcase. The first one becomes the cover on your tile.
            </p>
          </div>
        ) : null}

        {/* Keeper and likes */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
          {owner && (
            <Link
              href={owner.username ? `/u/${owner.username}` : "#"}
              className="inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/5 py-1.5 pl-1.5 pr-4 text-sm transition-colors hover:bg-white/10"
            >
              <Avatar name={owner.name} src={owner.avatar} society={ownerIsSociety} size={32} />
              <span className="text-ocean-400">
                {isOwner ? "Your tank" : "Kept by"}{" "}
                {!isOwner && <span className="text-white">{owner.name}</span>}
              </span>
              {ownerIsSociety && <SocietySeal size={16} className="h-4 w-4" />}
            </Link>
          )}
          <TankVoteControl tankId={t.id} initialScore={t.score ?? 0} orientation="horizontal" size="md" />
        </div>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {/* The story */}
            {t.description ? (
              <section className="mb-10">
                <h2 className="mb-3 font-display text-2xl text-white">About this tank</h2>
                <p className="whitespace-pre-line text-[15px] leading-relaxed text-ocean-200">{t.description}</p>
              </section>
            ) : isOwner ? (
              <p className="mb-10 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-ocean-400">
                No story yet. Add one with <span className="text-white">Edit showcase</span> — what the idea
                was, what you&apos;re proudest of.
              </p>
            ) : null}

            {/* Stock */}
            <section>
              <h2 className="mb-4 font-display text-2xl text-white">What&apos;s in it</h2>
              {items.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                  <p className="text-sm text-ocean-400">No fish added to this tank yet.</p>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {items.map((it) => {
                    const sp = bySlug.get(it.slug);
                    const inner = (
                      <>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white">{sp?.common_name ?? it.slug}</p>
                          {sp?.scientific_name && (
                            <p className="truncate text-xs italic text-ocean-400">{sp.scientific_name}</p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-0.5 text-sm text-ocean-200">
                          ×{it.qty}
                        </span>
                      </>
                    );
                    const cls =
                      "flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3";
                    return sp ? (
                      <Link
                        key={it.slug}
                        href={`/species/${it.slug}`}
                        className={`${cls} transition-colors hover:border-emerald-500/40 hover:bg-white/10`}
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div key={it.slug} className={cls}>
                        {inner}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* The setup */}
          <aside>
            {specRows.length > 0 || t.started_on ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 lg:sticky lg:top-24">
                <h2 className="mb-4 flex items-center gap-2 font-display text-lg text-white">
                  <Wrench className="h-4 w-4 text-ocean-400" /> The setup
                </h2>
                <dl className="space-y-3 text-sm">
                  {t.started_on && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-ocean-500">Set up</dt>
                      <dd className="mt-0.5 flex items-center gap-1.5 text-white">
                        <CalendarDays className="h-3.5 w-3.5 text-ocean-400" />
                        {new Date(`${t.started_on}T00:00:00`).toLocaleDateString(undefined, {
                          month: "long",
                          year: "numeric",
                        })}
                      </dd>
                    </div>
                  )}
                  {t.gallons && (
                    <div>
                      <dt className="text-xs uppercase tracking-wide text-ocean-500">Size</dt>
                      <dd className="mt-0.5 text-white">{t.gallons} gallons</dd>
                    </div>
                  )}
                  {specRows.map(({ key, label }) => (
                    <div key={key}>
                      <dt className="text-xs uppercase tracking-wide text-ocean-500">{label}</dt>
                      <dd className="mt-0.5 break-words text-white">{specs[key]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : isOwner ? (
              <div className="rounded-2xl border border-dashed border-white/15 p-5 text-sm text-ocean-400">
                List your filter, lights, substrate and the rest with <span className="text-white">Edit showcase</span>.
                Other keepers always want to know.
              </div>
            ) : null}
          </aside>
        </div>

        {/* Comments */}
        <div id="comments" className="mt-12">
          <TankComments
            tankId={t.id}
            initialComments={initialComments}
            currentUserId={user?.id ?? null}
            currentUserName={currentProfile?.name ?? null}
            currentUserUsername={currentProfile?.username ?? null}
            isOwner={isOwner}
          />
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-8">
          <Link href="/tank-builder" className="inline-flex items-center gap-2 text-ocean-300 transition-colors hover:text-white">
            <Fish className="h-4 w-4" /> Plan your own tank
          </Link>
          {!isOwner && <ReportButton tankId={t.id} />}
        </div>
      </div>
    </main>
  );
}
