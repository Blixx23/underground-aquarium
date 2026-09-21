import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
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
  if (!store) return { title: "Store not found" };

  const place = [store.city, store.state].filter(Boolean).join(", ");
  const title = place ? `${store.name} — ${place}` : store.name;
  const description =
    store.description ??
    `${store.name} is a local fish store${place ? ` in ${place}` : ""}. ` +
      `Hours, phone number, directions and reviews from other aquarium keepers.`;
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
    .select("id,user_id,rating,body,created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  const reviewList = (reviewRows ?? []) as {
    id: string;
    user_id: string;
    rating: number;
    body: string | null;
    created_at: string;
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
    response: respByReview.get(r.id) ?? null,
  }));
  const currentUserName = user ? nameById.get(user.id) ?? null : null;

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
        ? [{ "@type": "ListItem", position: 2, name: store.state, item: `${siteUrl}/stores` }]
        : []),
      { "@type": "ListItem", position: store.state ? 3 : 2, name: store.name, item: pageUrl },
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
          href="/stores"
          className="inline-flex items-center gap-2 text-sm text-ocean-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> All fish stores
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
            {store.description && (
              <p className="mb-8 leading-relaxed text-ocean-200">{store.description}</p>
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
