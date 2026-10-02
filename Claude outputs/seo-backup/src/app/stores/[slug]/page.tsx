import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cityPath, statePath, stateName } from "@/lib/stores/places";
import { getNearbyStores } from "@/lib/stores/nearby";
import PlaceStoreCard from "@/components/stores/PlaceStoreCard";
import StoreSightings, { type Sighting } from "@/components/stores/StoreSightings";
import SuggestFix from "@/components/stores/SuggestFix";
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  ArrowLeft,
  Navigation,
  BadgeCheck,
} from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import ClaimStore from "../ClaimStore";
import StoreReviews from "../StoreReviews";
import StorePosts from "../StorePosts";
import StoreFavoriteButton from "@/components/StoreFavoriteButton";
import StoreTracker from "@/components/stores/StoreTracker";
import TrackedLink from "@/components/stores/TrackedLink";
import StorePhotos, { type StorePhoto } from "@/components/stores/StorePhotos";
import StoreSpecialHours, { type SpecialDay } from "@/components/stores/StoreSpecialHours";
import OsmCredit from "@/components/stores/OsmCredit";
import Stars from "@/components/stores/Stars";
import { formatPhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

type StoreRow = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  tags: string[] | null;
  claimed_by: string | null;
  source: string | null;
};

const STORE_COLS =
  "id, slug, name, address, city, state, phone, website, hours, description, tags, claimed_by, source, lat, lng";

/** What each directory tag means in plain words, for the generated copy. */
const TAG_WORDS: Record<string, string> = {
  saltwater: "saltwater fish and coral",
  freshwater: "freshwater tropical fish",
  pond: "pond fish and koi",
  plants: "live aquarium plants",
  shrimp: "freshwater shrimp",
};

function specialtyPhrase(tags: string[] | null): string | null {
  const words = (tags ?? [])
    .map((t) => TAG_WORDS[t.toLowerCase()])
    .filter((w): w is string => !!w);
  if (words.length === 0) return null;
  if (words.length === 1) return words[0];
  return `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}`;
}

function milesLabel(d: number): string {
  return d < 10 ? `${d.toFixed(1)} mi` : `${Math.round(d)} mi`;
}

async function getStore(slug: string) {
  // postal_code only exists on some schemas; fall back without it.
  const withZip = await supabasePublic
    .from("fish_stores")
    .select(`${STORE_COLS}, postal_code`)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!withZip.error) return (withZip.data as StoreRow | null) ?? null;
  const { data } = await supabasePublic
    .from("fish_stores")
    .select(STORE_COLS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  return (data as StoreRow | null) ?? null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const store = await getStore(slug);
  // Metadata resolves before the page streams, so this gives search engines
  // a real 404 instead of a 200 "not found" page.
  if (!store) notFound();

  const place = [store.city, store.state].filter(Boolean).join(", ");
  // "Name: Aquarium Store in City, ST" matches both "name + city" searches
  // and "aquarium store city" searches.
  const title = place ? `${store.name}: Aquarium Store in ${place}` : `${store.name}: Aquarium Store`;
  const specialty = specialtyPhrase(store.tags);
  const built =
    `${store.name} is an independent aquarium store${place ? ` in ${place}` : ""}` +
    `${store.address ? ` at ${store.address}` : ""}` +
    `${specialty ? `, carrying ${specialty}` : ""}. ` +
    `${store.phone ? `Call ${formatPhone(store.phone)}. ` : ""}` +
    `Directions, hours, reviews and what's in stock from local fish keepers.`;
  const raw = store.description?.trim() || built;
  const description = raw.length > 158 ? `${raw.slice(0, 155).trimEnd()}…` : raw;
  return {
    title,
    description,
    alternates: { canonical: `/stores/${store.slug}` },
    openGraph: { title, description, url: `/stores/${store.slug}`, type: "website" },
  };
}

export default async function StoreDetailPage({ params }: Params) {
  const { slug } = await params;
  const store = await getStore(slug);
  if (!store) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && store.claimed_by === user.id;

  // Favorites: total count + whether the current user has favorited this store
  const { count: favoriteCount } = await supabasePublic
    .from("store_favorites")
    .select("*", { count: "exact", head: true })
    .eq("fish_store_id", store.id);

  let isFavorited = false;
  if (user) {
    const { data: favRow } = await supabase
      .from("store_favorites")
      .select("user_id")
      .eq("user_id", user.id)
      .eq("fish_store_id", store.id)
      .maybeSingle();
    isFavorited = !!favRow;
  }

  // Reviews
  const { data: reviewRows } = await supabasePublic
    .from("store_reviews")
    .select("id,user_id,rating,body,created_at,edited_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  const reviewList = (reviewRows ?? []) as {
    id: string;
    user_id: string;
    rating: number;
    body: string | null;
    created_at: string;
    edited_at: string | null;
  }[];

  const authorIds = new Set(reviewList.map((r) => r.user_id));
  if (user) authorIds.add(user.id);
  let nameById = new Map<string, string>();
  if (authorIds.size > 0) {
    const { data: profs } = await supabasePublic
      .from("profiles")
      .select("id,username,full_name")
      .in("id", Array.from(authorIds));
    nameById = new Map(
      (
        (profs as {
          id: string;
          username: string | null;
          full_name: string | null;
        }[]) ?? []
      ).map((p) => [p.id, p.full_name || p.username || "Aquarist"])
    );
  }

  const reviewIds = reviewList.map((r) => r.id);
  let respByReview = new Map<string, string>();
  if (reviewIds.length > 0) {
    const { data: resps } = await supabasePublic
      .from("review_responses")
      .select("review_id,body")
      .in("review_id", reviewIds);
    respByReview = new Map(
      ((resps as { review_id: string; body: string }[]) ?? []).map((r) => [
        r.review_id,
        r.body,
      ])
    );
  }

  const initialReviews = reviewList.map((r) => ({
    id: r.id,
    userId: r.user_id,
    authorName: nameById.get(r.user_id) || "Aquarist",
    rating: r.rating,
    body: r.body,
    createdAt: r.created_at,
    editedAt: r.edited_at ?? null,
    response: respByReview.get(r.id) ?? null,
  }));
  const currentUserName = user ? nameById.get(user.id) ?? null : null;

  // What shoppers spotted in stock, last 60 days. Missing table = empty list.
  const { data: sightRows } = await supabasePublic
    .from("store_sightings")
    .select("id, user_id, body, created_at")
    .eq("store_id", store.id)
    .is("hidden_at", null)
    .gt("created_at", new Date(Date.now() - 60 * 86400000).toISOString())
    .order("created_at", { ascending: false })
    .limit(20);
  const sightList = (sightRows ?? []) as { id: string; user_id: string; body: string; created_at: string }[];
  const sightAuthors = new Map<string, { name: string; username: string | null }>();
  if (sightList.length) {
    const { data: sp } = await supabasePublic
      .from("profiles")
      .select("id, username, full_name")
      .in("id", [...new Set(sightList.map((x) => x.user_id))]);
    for (const p of (sp ?? []) as { id: string; username: string | null; full_name: string | null }[]) {
      sightAuthors.set(p.id, { name: p.full_name || p.username || "Aquarist", username: p.username });
    }
  }
  const sightings: Sighting[] = sightList.map((x) => ({
    id: x.id,
    userId: x.user_id,
    author: sightAuthors.get(x.user_id)?.name ?? "Aquarist",
    username: sightAuthors.get(x.user_id)?.username ?? null,
    body: x.body,
    createdAt: x.created_at,
  }));

  // Shop updates
  // Photos on updates came later; if that column isn't there, still show the text.
  const withPhotos = await supabasePublic
    .from("store_posts")
    .select("id,title,body,images,created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  let postRows: unknown[] | null = withPhotos.data;
  if (withPhotos.error) {
    const retry = await supabasePublic
      .from("store_posts")
      .select("id,title,body,created_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    postRows = (retry.data ?? []).map((r) => ({ ...r, images: null }));
  }
  const initialPosts = (
    (postRows as {
      id: string;
      title: string | null;
      body: string;
      images: string[] | null;
      created_at: string;
    }[]) ?? []
  ).map((p) => ({
    id: p.id,
    title: p.title,
    body: p.body,
    images: p.images ?? null,
    createdAt: p.created_at,
  }));

  // The shop's own extras: what's in today, photos, and any odd hours coming up.
  const nearby = await getNearbyStores(store.lat ?? null, store.lng ?? null, store.id);

  const [{ data: photoRows }, { data: specialRows }] = await Promise.all([
    supabasePublic
      .from("store_photos")
      .select("id, url, caption")
      .eq("store_id", store.id)
      .order("sort")
      .order("created_at"),
    supabasePublic
      .from("store_special_hours")
      .select("id, day, closed, note")
      .eq("store_id", store.id)
      .gte("day", new Date().toISOString().slice(0, 10))
      .order("day"),
  ]);
  const photos = (photoRows ?? []) as StorePhoto[];
  const specialDays = (specialRows ?? []) as SpecialDay[];

  const specialty = specialtyPhrase(store.tags);
  const place = [store.city, store.state].filter(Boolean).join(", ");
  const fullAddress = [store.address, place].filter(Boolean).join(", ");
  const directionsQuery = encodeURIComponent(
    fullAddress || `${store.name} ${place}`.trim()
  );
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${directionsQuery}`;

  let websiteHref: string | null = null;
  let websiteLabel: string | null = null;
  if (store.website) {
    websiteHref = store.website.startsWith("http")
      ? store.website
      : `https://${store.website}`;
    websiteLabel = store.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  const phoneHref = store.phone
    ? `tel:${store.phone.replace(/[^0-9+]/g, "")}`
    : null;

  const ratingCount = initialReviews.length;
  const ratingAvg = ratingCount
    ? initialReviews.reduce((n, r) => n + r.rating, 0) / ratingCount
    : null;

  const rowClass =
    "flex items-start gap-3 rounded-xl px-3.5 py-3 text-sm transition-colors";

  const siteUrl = "https://www.undergroundaquarium.com";
  const pageUrl = `${siteUrl}/stores/${store.slug}`;

  /**
   * A shop is a place in the world, not just a web page. Telling search
   * engines that — with its address, phone, hours and rating — is what puts
   * it in local results and map packs.
   */
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "PetStore",
    "@id": pageUrl,
    name: store.name,
    url: pageUrl,
    ...(store.description ? { description: store.description } : {}),
    ...(store.phone ? { telephone: store.phone } : {}),
    ...(websiteHref ? { sameAs: [websiteHref] } : {}),
    ...(store.hours ? { openingHours: store.hours } : {}),
    address: {
      "@type": "PostalAddress",
      ...(store.address ? { streetAddress: store.address } : {}),
      ...(store.city ? { addressLocality: store.city } : {}),
      ...(store.state ? { addressRegion: store.state } : {}),
      ...(store.postal_code ? { postalCode: store.postal_code } : {}),
      addressCountry: "US",
    },
    ...(store.lat != null && store.lng != null
      ? { geo: { "@type": "GeoCoordinates", latitude: store.lat, longitude: store.lng } }
      : {}),
    ...(ratingCount > 0 && ratingAvg != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(ratingAvg.toFixed(1)),
            reviewCount: ratingCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Fish stores", item: `${siteUrl}/stores` },
      ...(store.state
        ? [{ "@type": "ListItem", position: 2, name: stateName(store.state), item: `${siteUrl}${statePath(store.state)}` }]
        : []),
      ...(store.state && store.city
        ? [{ "@type": "ListItem", position: 3, name: store.city, item: `${siteUrl}${cityPath(store.state, store.city)}` }]
        : []),
      {
        "@type": "ListItem",
        position: 2 + (store.state ? 1 : 0) + (store.state && store.city ? 1 : 0),
        name: store.name,
        item: pageUrl,
      },
    ],
  };

  return (
    <main className="min-h-screen px-6 pb-20 pt-24">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <div className="mx-auto max-w-6xl">
        <StoreTracker storeId={store.id} />

        <Link
          href={store.state && store.city ? cityPath(store.state, store.city) : "/stores"}
          className="inline-flex items-center gap-2 text-sm text-ocean-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />{" "}
          {store.state && store.city ? `More fish stores in ${store.city}` : "All fish stores"}
        </Link>

        {/* Name, place and standing — everything you need to decide, before any scrolling. */}
        <header className="mt-5 border-b border-white/10 pb-6">
          <div className="flex items-start justify-between gap-4">
            <h1 className="font-display text-3xl text-white sm:text-4xl">{store.name}</h1>
            <div className="shrink-0 pt-1">
              <StoreFavoriteButton
                storeId={store.id}
                initialFavorited={isFavorited}
                initialCount={favoriteCount ?? 0}
              />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {place && (
              <span className="flex items-center gap-1.5 text-ocean-300">
                <MapPin className="h-4 w-4 shrink-0" />
                {store.address ? `${store.address}, ${place}` : place}
              </span>
            )}
            <a href="#reviews" className="transition-opacity hover:opacity-80">
              <Stars rating={ratingAvg} count={ratingCount} size={16} />
            </a>
            {store.claimed_by && (
              <span className="inline-flex items-center gap-1 text-emerald-300">
                <BadgeCheck className="h-4 w-4" /> Owner managed
              </span>
            )}
          </div>
          {store.tags && store.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {store.tags.map((t) => (
                <span
                  key={t}
                  className="rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] uppercase tracking-wide text-emerald-300/90"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </header>

        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* ---- What the shop has to say ---- */}
          <div className="order-2 min-w-0 lg:order-1">
            {store.description ? (
              <p className="mb-8 leading-relaxed text-ocean-200">{store.description}</p>
            ) : (
              // Most listings have no write-up yet. Say what we do know, in
              // words, so the page is about this shop and not a blank template.
              <p className="mb-8 leading-relaxed text-ocean-200">
                {store.name} is an independent aquarium and tropical fish store
                {store.city ? ` in ${store.city}, ${stateName(store.state ?? "")}` : ""}
                {store.address ? `, at ${store.address}` : ""}.
                {specialty ? ` Local fish keepers come here for ${specialty}.` : ""}
                {store.phone ? ` Call ${formatPhone(store.phone)} to check hours and what's in the tanks before you drive over.` : ""}
                {nearby.length > 0 && (
                  <>
                    {" "}The closest other fish {nearby.length === 1 ? "store is" : "stores are"}{" "}
                    {nearby.slice(0, 3).map(({ s: n, d }, i, arr) => (
                      <span key={n.id}>
                        <Link href={`/stores/${n.slug}`} className="text-ocean-100 underline decoration-ocean-600 underline-offset-2 hover:text-white">
                          {n.name}
                        </Link>{" "}
                        ({milesLabel(d)}){i < arr.length - 2 ? ", " : i === arr.length - 2 ? " and " : ""}
                      </span>
                    ))}
                    .
                  </>
                )}
              </p>
            )}

            {isOwner && (
              <div className="mb-8 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-5">
                <p className="font-medium text-white">You manage this shop</p>
                <p className="mt-1 text-sm text-ocean-300">
                  Photos, hours, replies and your free marketing kit all live in one place.
                </p>
                <Link
                  href={`/my/shops/${store.slug}`}
                  className="mt-3 inline-block rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400"
                >
                  Open your shop dashboard
                </Link>
              </div>
            )}

            <StoreSightings
              storeId={store.id}
              storeName={store.name}
              initial={sightings}
              currentUserId={user?.id ?? null}
              currentUserName={currentUserName}
            />

            <StorePhotos
              storeId={store.id}
              userId={user?.id ?? null}
              initial={photos}
              isOwner={false}
            />

            <StorePosts
              storeId={store.id}
              initialPosts={initialPosts}
              isOwner={isOwner}
              currentUserId={user?.id ?? null}
            />

            <div id="reviews" />
            <StoreReviews
              storeId={store.id}
              initialReviews={initialReviews}
              currentUserId={user?.id ?? null}
              currentUserName={currentUserName}
              isOwner={isOwner}
            />

            {/* Good to know: the questions people type into Google about a shop. */}
            <section className="mt-12 border-t border-white/10 pt-8">
              <h2 className="mb-4 font-display text-xl text-white">Good to know about {store.name}</h2>
              <dl className="space-y-5 text-sm">
                <div>
                  <dt className="font-medium text-white">Where is {store.name}?</dt>
                  <dd className="mt-1 text-ocean-300">
                    {fullAddress ? `${fullAddress}.` : `In ${place || "the area listed above"}.`}{" "}
                    <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="text-ocean-100 underline decoration-ocean-600 underline-offset-2 hover:text-white">
                      Get directions
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-white">What are {store.name}&apos;s hours?</dt>
                  <dd className="mt-1 text-ocean-300">
                    {store.hours
                      ? store.hours
                      : store.phone
                      ? `Hours aren't listed yet. Call ${formatPhone(store.phone)} before you go.`
                      : "Hours aren't listed yet. Check with the shop before you go."}
                  </dd>
                </div>
                {specialty && (
                  <div>
                    <dt className="font-medium text-white">What does {store.name} sell?</dt>
                    <dd className="mt-1 text-ocean-300">
                      Fish keepers list it for {specialty}. Stock changes fast, so see what shoppers spotted recently above.
                    </dd>
                  </div>
                )}
                {nearby.length > 0 && (
                  <div>
                    <dt className="font-medium text-white">What other aquarium stores are near {store.name}?</dt>
                    <dd className="mt-1 text-ocean-300">
                      {nearby.map(({ s: n, d }, i) => (
                        <span key={n.id}>
                          {i > 0 ? ", " : ""}
                          <Link href={`/stores/${n.slug}`} className="text-ocean-100 underline decoration-ocean-600 underline-offset-2 hover:text-white">
                            {n.name}
                          </Link>{" "}
                          ({milesLabel(d)}{n.city && n.city !== store.city ? `, ${n.city}` : ""})
                        </span>
                      ))}
                      .
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {nearby.length > 0 && (
              <section className="mt-12 border-t border-white/10 pt-8">
                <div className="mb-4 flex items-baseline justify-between gap-3">
                  <h2 className="font-display text-xl text-white">Other fish stores nearby</h2>
                  {store.state && store.city && (
                    <Link
                      href={cityPath(store.state, store.city)}
                      className="shrink-0 text-sm text-ocean-400 hover:text-white"
                    >
                      All in {store.city} →
                    </Link>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {nearby.map(({ s, d }) => (
                    <PlaceStoreCard key={s.id} s={s} distance={d} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ---- Getting there and getting in touch ---- */}
          <aside className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-24">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <TrackedLink
                  href={directionsUrl}
                  storeId={store.id}
                  kind="directions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400"
                >
                  <Navigation className="h-4 w-4" /> Get directions
                </TrackedLink>

                <div className="mt-3 space-y-1">
                  {phoneHref && (
                    <TrackedLink
                      href={phoneHref}
                      storeId={store.id}
                      kind="phone"
                      className={`${rowClass} hover:bg-white/5`}
                    >
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-ocean-400" />
                      <span className="font-medium text-white">{store.phone}</span>
                    </TrackedLink>
                  )}
                  {websiteHref && (
                    <TrackedLink
                      href={websiteHref}
                      storeId={store.id}
                      kind="website"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${rowClass} hover:bg-white/5`}
                    >
                      <Globe className="mt-0.5 h-4 w-4 shrink-0 text-ocean-400" />
                      <span className="min-w-0 break-words text-ocean-200">{websiteLabel}</span>
                    </TrackedLink>
                  )}
                  {store.hours && (
                    <div className={rowClass}>
                      <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ocean-400" />
                      <p className="whitespace-pre-wrap text-ocean-200">{store.hours}</p>
                    </div>
                  )}
                  {!phoneHref && !websiteHref && !store.hours && (
                    <p className="px-3.5 py-2 text-sm text-ocean-500">
                      No phone or hours listed yet.
                    </p>
                  )}
                </div>

              </div>

              <StoreSpecialHours storeId={store.id} initial={specialDays} isOwner={false} />

              <SuggestFix storeId={store.id} currentUserId={user?.id ?? null} />

              <ClaimStore
                storeId={store.id}
                storeName={store.name}
                claimed={!!store.claimed_by}
              />


              {store.source === "osm" && <OsmCredit className="mt-6" />}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
