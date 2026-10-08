import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cityPath, statePath, stateName } from "@/lib/stores/places";
import { getNearbyStores } from "@/lib/stores/nearby";
import PlaceStoreCard from "@/components/stores/PlaceStoreCard";
import SuggestFix from "@/components/stores/SuggestFix";
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  ArrowLeft,
  Navigation,
  BadgeCheck,
  LayoutDashboard,
  Info,
  Star,
} from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { canSeeHiddenShop } from "@/lib/stores/viewer";
import { createClient } from "@/lib/supabase/server";
import ClaimStore from "../ClaimStore";
import StoreReviews from "../StoreReviews";
import StoreFavoriteButton from "@/components/StoreFavoriteButton";
import StoreTracker from "@/components/stores/StoreTracker";
import TrackedLink from "@/components/stores/TrackedLink";
import StoreSpecialHours, { type SpecialDay } from "@/components/stores/StoreSpecialHours";
import OsmCredit from "@/components/stores/OsmCredit";
import Stars from "@/components/stores/Stars";
import ShopLogo from "@/components/stores/ShopLogo";
import BrandingButton from "@/components/stores/BrandingButton";
import ShopTimeline, { type TimelineItem } from "@/components/stores/ShopTimeline";
import ShopPhotoGrid, { type GridPhoto } from "@/components/stores/ShopPhotoGrid";
import { formatPhone } from "@/lib/phone";
import { storeIsStub } from "@/lib/stores/thin";
import StoreMap from "@/components/stores/StoreMap";

/** "Joe's Fish" -> "Joe's Fish's", but "Seven Seas" -> "Seven Seas'". */
function possessive(name: string) {
  return /s$/i.test(name.trim()) ? `${name}'` : `${name}'s`;
}

/** Imported addresses sometimes end in a bare suite letter: "6910 Luther Dr i". */
function tidyAddress(a: string | null): string | null {
  if (!a) return a;
  return a.trim().replace(/\s([A-Za-z])$/, (_m, l: string) => ` Ste ${l.toUpperCase()}`);
}

export const dynamic = "force-dynamic";

type Tab = "posts" | "photos" | "reviews" | "about";
const TABS: Tab[] = ["posts", "photos", "reviews", "about"];

type Params = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
};

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
  cover_url?: string | null;
  logo_url?: string | null;
  status?: string | null;
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

/** The day a photo was added, in shop time, so one day's uploads group together. */
const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" });

async function getStore(slug: string) {
  // Newer columns (banner, logo, zip) may not exist on every database yet,
  // so try the fullest read first and fall back rather than 404ing.
  // Read with the service client so a hidden shop is found too; who gets to
  // see a hidden one is decided in visibleStore below.
  const tries = [
    `${STORE_COLS}, status, postal_code, cover_url, logo_url`,
    `${STORE_COLS}, status, cover_url, logo_url`,
    `${STORE_COLS}, status, postal_code`,
    `${STORE_COLS}, status`,
  ];
  for (const cols of tries) {
    const { data, error } = await supabaseAdmin.from("fish_stores").select(cols).eq("slug", slug).maybeSingle();
    if (error) continue;
    const row = (data as unknown as StoreRow | null) ?? null;
    return row ? { ...row, address: tidyAddress(row.address) } : null;
  }
  return null;
}

/**
 * The shop, if this visitor may see it. Published shops are for everyone.
 * A hidden shop is only shown to its owner and site admins, so they can
 * still check their page; everyone else gets a real 404.
 */
async function visibleStore(slug: string) {
  const store = await getStore(slug);
  if (!store) return null;
  if (store.status === "published") return { store, hidden: false };
  if (await canSeeHiddenShop(store.claimed_by)) return { store, hidden: true };
  return null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const found = await visibleStore(slug);
  // Metadata resolves before the page streams, so this gives search engines
  // a real 404 instead of a 200 "not found" page.
  if (!found) notFound();
  const { store, hidden } = found;

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
    `Directions, hours, photos, shop updates and reviews.`;
  const raw = store.description?.trim() || built;
  const description = raw.length > 158 ? `${raw.slice(0, 155).trimEnd()}…` : raw;
  const { count: reviews } = await supabasePublic
    .from("store_reviews")
    .select("id", { count: "exact", head: true })
    .eq("store_id", store.id);
  // Each shop shares its own designed card: logo, name, town and stars.
  // The version changes when the logo, name, town or review count does,
  // so Facebook and friends fetch the new picture instead of an old copy.
  const stamp = [store.name, place, store.logo_url ?? "", reviews ?? 0].join("|");
  let h = 5381;
  for (let i = 0; i < stamp.length; i++) h = ((h << 5) + h + stamp.charCodeAt(i)) >>> 0;
  const shareImage = {
    url: `/api/stores/${store.slug}/share-image?v=${h.toString(36)}`,
    width: 1200,
    height: 630,
    alt: `${store.name}${place ? `, ${place}` : ""} on Underground Aquarium`,
  };
  return {
    title,
    description,
    alternates: { canonical: `/stores/${store.slug}` },
    robots: hidden ? { index: false, follow: false } : { index: !storeIsStub({ ...store, reviews }), follow: true },
    openGraph: {
      title: store.name,
      description,
      url: `/stores/${store.slug}`,
      siteName: "Underground Aquarium",
      type: "website",
      images: [shareImage],
    },
    twitter: {
      card: "summary_large_image",
      title: store.name,
      description,
      images: [shareImage.url],
    },
  };
}

export default async function StoreDetailPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const rawTab = (await searchParams).tab;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "posts";

  const found = await visibleStore(slug);
  if (!found) notFound();
  const { store, hidden } = found;
  // A hidden shop's own rows may be out of reach for public reads, so its
  // owner's view reads them with the service client.
  const db = hidden ? supabaseAdmin : supabasePublic;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isOwner = !!user && store.claimed_by === user.id;
  const claimed = !!store.claimed_by;

  // Followers: total count + whether the current user follows this shop
  const { count: favoriteCount } = await db
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
  const { data: reviewRows } = await db
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
    const { data: profs } = await db
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
    const { data: resps } = await db
      .from("review_responses")
      .select("review_id,body")
      .in("review_id", reviewIds);
    respByReview = new Map(
      ((resps as { review_id: string; body: string }[]) ?? []).map((r) => [r.review_id, r.body])
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

  // The shop's posts. Photos on posts came later; without that column, still show the text.
  const withPhotos = await db
    .from("store_posts")
    .select("id,title,body,images,created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  let postRows: unknown[] | null = withPhotos.data;
  if (withPhotos.error) {
    const retry = await db
      .from("store_posts")
      .select("id,title,body,created_at")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    postRows = (retry.data ?? []).map((r) => ({ ...r, images: null }));
  }
  const posts = (
    (postRows as {
      id: string;
      title: string | null;
      body: string;
      images: string[] | null;
      created_at: string;
    }[]) ?? []
  ).map((p) => ({ ...p, images: (p.images ?? []).filter(Boolean) }));

  const nearby = await getNearbyStores(store.lat ?? null, store.lng ?? null, store.id);

  const [{ data: photoRows }, { data: specialRows }] = await Promise.all([
    db
      .from("store_photos")
      .select("id, url, caption, created_at")
      .eq("store_id", store.id)
      .order("sort")
      .order("created_at"),
    db
      .from("store_special_hours")
      .select("id, day, closed, note")
      .eq("store_id", store.id)
      .gte("day", new Date().toISOString().slice(0, 10))
      .order("day"),
  ]);
  const galleryPhotos = (photoRows ?? []) as {
    id: string;
    url: string;
    caption: string | null;
    created_at: string;
  }[];
  const specialDays = (specialRows ?? []) as SpecialDay[];

  // ---- The timeline: posts, plus gallery photos shown as "added N photos" ----
  // Gallery photos the shop uploaded before posts existed are grouped by the
  // day they were added and shown as one post each. Nothing is written to the
  // database for this; it's only how the page lays them out.
  const albums = new Map<string, { images: string[]; createdAt: string }>();
  for (const ph of galleryPhotos) {
    const key = dayKey.format(new Date(ph.created_at));
    const a = albums.get(key);
    if (a) {
      a.images.push(ph.url);
      if (ph.created_at > a.createdAt) a.createdAt = ph.created_at;
    } else {
      albums.set(key, { images: [ph.url], createdAt: ph.created_at });
    }
  }
  const timeline: TimelineItem[] = [
    ...posts.map(
      (p): TimelineItem => ({
        kind: "post",
        id: p.id,
        title: p.title,
        body: p.body,
        images: p.images.length ? p.images : null,
        createdAt: p.created_at,
      })
    ),
    ...[...albums.entries()].map(
      ([key, a]): TimelineItem => ({ kind: "album", id: `album-${key}`, images: a.images, createdAt: a.createdAt })
    ),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  // ---- Every photo the shop has shared, newest first, no repeats ----
  const allPhotos: GridPhoto[] = [];
  const seen = new Set<string>();
  const photoEvents = [
    ...posts.flatMap((p) => p.images.map((url) => ({ url, caption: p.title, at: p.created_at }))),
    ...galleryPhotos.map((g) => ({ url: g.url, caption: g.caption, at: g.created_at })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1));
  for (const ph of photoEvents) {
    if (seen.has(ph.url)) continue;
    seen.add(ph.url);
    allPhotos.push({ url: ph.url, caption: ph.caption });
  }

  const specialty = specialtyPhrase(store.tags);
  const place = [store.city, store.state].filter(Boolean).join(", ");
  const fullAddress = [store.address, place].filter(Boolean).join(", ");
  const directionsQuery = encodeURIComponent(fullAddress || `${store.name} ${place}`.trim());
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${directionsQuery}`;

  let websiteHref: string | null = null;
  let websiteLabel: string | null = null;
  if (store.website) {
    websiteHref = store.website.startsWith("http") ? store.website : `https://${store.website}`;
    websiteLabel = store.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }

  const phoneHref = store.phone ? `tel:${store.phone.replace(/[^0-9+]/g, "")}` : null;

  const ratingCount = initialReviews.length;
  const ratingAvg = ratingCount ? initialReviews.reduce((n, r) => n + r.rating, 0) / ratingCount : null;

  const siteUrl = "https://www.undergroundaquarium.com";
  const pageUrl = `${siteUrl}/stores/${store.slug}`;
  const base = `/stores/${store.slug}`;
  const tabHref = (t: Tab) => (t === "posts" ? base : `${base}?tab=${t}`);

  /**
   * A shop is a place in the world, not just a web page. Telling search
   * engines that, with its address, phone, hours and rating, is what puts
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
    ...(store.logo_url ? { logo: store.logo_url } : {}),
    ...(store.cover_url || allPhotos[0] ? { image: store.cover_url || allPhotos[0].url } : {}),
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

  // ---- Pieces used on more than one tab ----

  const aboutText = store.description ? (
    <p className="whitespace-pre-wrap leading-relaxed text-ocean-200">{store.description}</p>
  ) : (
    // Most listings have no write-up yet. Say what we do know, in words, so
    // the page is about this shop and not a blank template.
    <p className="leading-relaxed text-ocean-200">
      {store.name} is an independent aquarium and tropical fish store
      {store.city ? ` in ${store.city}, ${stateName(store.state ?? "")}` : ""}
      {store.address ? `, at ${store.address}` : ""}.
      {specialty ? ` Local fish keepers come here for ${specialty}.` : ""}
      {store.phone ? ` Call ${formatPhone(store.phone)} to check hours and what's in the tanks before you drive over.` : ""}
    </p>
  );

  const contactRows = (
    <ul className="space-y-3 text-sm">
      {fullAddress && (
        <li className="flex gap-3">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ocean-400" />
          <TrackedLink
            href={directionsUrl}
            storeId={store.id}
            kind="directions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ocean-200 hover:text-white"
          >
            {fullAddress}
          </TrackedLink>
        </li>
      )}
      {phoneHref && (
        <li className="flex gap-3">
          <Phone className="mt-0.5 h-4 w-4 shrink-0 text-ocean-400" />
          <TrackedLink href={phoneHref} storeId={store.id} kind="phone" className="font-medium text-white hover:text-emerald-200">
            {formatPhone(store.phone!)}
          </TrackedLink>
        </li>
      )}
      {websiteHref && (
        <li className="flex gap-3">
          <Globe className="mt-0.5 h-4 w-4 shrink-0 text-ocean-400" />
          <TrackedLink
            href={websiteHref}
            storeId={store.id}
            kind="website"
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-0 break-words text-ocean-200 hover:text-white"
          >
            {websiteLabel}
          </TrackedLink>
        </li>
      )}
      {store.hours && (
        <li className="flex gap-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ocean-400" />
          <p className="whitespace-pre-wrap text-ocean-200">{store.hours}</p>
        </li>
      )}
      {!phoneHref && !websiteHref && !store.hours && (
        <li className="text-ocean-500">No phone or hours listed yet.</li>
      )}
    </ul>
  );

  const card = "rounded-2xl border border-white/10 bg-white/[0.04] p-5";

  const goodToKnow = (
    <section className={card}>
      <h2 className="mb-4 font-display text-xl text-white">Good to know about {store.name}</h2>
      <dl className="space-y-5 text-sm">
        <div>
          <dt className="font-medium text-white">Where is {store.name}?</dt>
          <dd className="mt-1 text-ocean-300">
            {fullAddress ? `${fullAddress}.` : `In ${place || "the area listed above"}.`}{" "}
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ocean-100 underline decoration-ocean-600 underline-offset-2 hover:text-white"
            >
              Get directions
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-medium text-white">What are {possessive(store.name)} hours?</dt>
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
              Fish keepers list it for {specialty}. Stock changes fast, so check the shop&apos;s latest posts or call
              ahead.
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
                  <Link
                    href={`/stores/${n.slug}`}
                    className="text-ocean-100 underline decoration-ocean-600 underline-offset-2 hover:text-white"
                  >
                    {n.name}
                  </Link>{" "}
                  ({milesLabel(d)}
                  {n.city && n.city !== store.city ? `, ${n.city}` : ""})
                </span>
              ))}
              .
            </dd>
          </div>
        )}
      </dl>
    </section>
  );

  const nearbySection =
    nearby.length > 0 ? (
      <section>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl text-white">Other fish stores nearby</h2>
          {store.state && store.city && (
            <Link href={cityPath(store.state, store.city)} className="shrink-0 text-sm text-ocean-400 hover:text-white">
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
    ) : null;

  const mapSection =
    store.lat != null && store.lng != null ? (
      <section className={card}>
        <h2 className="mb-4 font-display text-xl text-white">On the map</h2>
        <StoreMap
          points={[
            { slug: store.slug, name: store.name, lat: store.lat, lng: store.lng, sub: fullAddress || null, main: true },
            ...nearby
              .filter(({ s: n }) => n.lat != null && n.lng != null)
              .map(({ s: n, d }) => ({
                slug: n.slug,
                name: n.name,
                lat: n.lat as number,
                lng: n.lng as number,
                sub: `${[n.city, n.state].filter(Boolean).join(", ")} · ${d.toFixed(1)} mi`,
              })),
          ]}
          height={260}
        />
      </section>
    ) : null;

  // Unclaimed shops: claiming, fixes and map credit. Claimed shops are run by
  // their owner, so customers only leave reviews there.
  const directoryExtras = (
    <>
      {!claimed && <SuggestFix storeId={store.id} currentUserId={user?.id ?? null} />}
      <ClaimStore storeId={store.id} storeName={store.name} claimed={claimed} />
      {store.source === "osm" && <OsmCredit className="mt-6" />}
    </>
  );

  const tabLabel: Record<Tab, string> = {
    posts: "Posts",
    photos: allPhotos.length ? `Photos · ${allPhotos.length}` : "Photos",
    reviews: ratingCount ? `Reviews · ${ratingCount}` : "Reviews",
    about: "About",
  };

  return (
    <main className="min-h-screen px-4 pb-20 pt-24 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="mx-auto max-w-5xl">
        {!hidden && <StoreTracker storeId={store.id} />}

        {hidden && store.status === "wholesale" && (
          <div className="mb-4 rounded-2xl border border-violet-400/40 bg-violet-400/10 px-4 py-3 text-sm text-violet-100">
            <span className="font-semibold">Wholesale supply.</span> This business is on your Wholesale list, not in Shops.
            Only you can see this page, and it gets no shop emails.
          </div>
        )}
        {hidden && store.status !== "wholesale" && (
          <div className="mb-4 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
            <span className="font-semibold">Hidden from Shops.</span> Only you can see this page. Visitors, search engines
            and Facebook get &quot;not found&quot; until the shop is shown again.
          </div>
        )}

        <Link
          href={store.state && store.city ? cityPath(store.state, store.city) : "/stores"}
          className="inline-flex items-center gap-2 text-sm text-ocean-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />{" "}
          {store.state && store.city ? `More fish stores in ${store.city}` : "All fish stores"}
        </Link>

        {/* ---- Banner, logo, name and the buttons people came for ---- */}
        <header className="mt-4 overflow-hidden rounded-3xl border border-white/10 bg-ocean-950/60">
          <div className="relative aspect-[16/7] w-full sm:aspect-[16/5]">
            {store.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={store.cover_url} alt={`${store.name} banner`} className="h-full w-full object-cover" />
            ) : (
              // Until the owner adds a banner, a calm ocean one with their name.
              <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-ocean-800 via-ocean-900 to-[#03141f]">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse at 20% 0%, rgba(52,211,153,0.22) 0%, transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(56,189,248,0.18) 0%, transparent 60%)",
                  }}
                />
                <p
                  aria-hidden
                  className="absolute inset-x-6 bottom-4 truncate text-right font-display text-3xl uppercase tracking-[0.12em] text-white/[0.07] sm:text-6xl"
                >
                  {store.name}
                </p>
              </div>
            )}
            {isOwner && user && (
              <div className="absolute bottom-3 right-3">
                <BrandingButton storeId={store.id} userId={user.id} kind="cover" hasImage={!!store.cover_url} />
              </div>
            )}
          </div>

          <div className="px-4 pb-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="relative -mt-12 w-fit sm:-mt-16">
                <ShopLogo
                  name={store.name}
                  url={store.logo_url ?? null}
                  fluid
                  className="h-24 w-24 ring-4 ring-ocean-950 sm:h-32 sm:w-32"
                />
                {isOwner && user && (
                  <div className="absolute -bottom-1 -right-1">
                    <BrandingButton
                      storeId={store.id}
                      userId={user.id}
                      kind="logo"
                      hasImage={!!store.logo_url}
                      className="!px-2 !py-2"
                    />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 sm:pb-1">
                <h1 className="font-display text-3xl leading-tight text-white sm:text-4xl">{store.name}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                  {place && (
                    <span className="flex items-center gap-1.5 text-ocean-300">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {place}
                    </span>
                  )}
                  <Link href={tabHref("reviews")} scroll={false} className="transition-opacity hover:opacity-80">
                    <Stars rating={ratingAvg} count={ratingCount} size={15} />
                  </Link>
                  {claimed && (
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <BadgeCheck className="h-4 w-4" /> Owner managed
                    </span>
                  )}
                </div>
                {store.tags && store.tags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
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
              </div>
            </div>

            {/* The buttons people came for */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <TrackedLink
                href={directionsUrl}
                storeId={store.id}
                kind="directions"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400"
              >
                <Navigation className="h-4 w-4" /> Directions
              </TrackedLink>
              {phoneHref && (
                <TrackedLink
                  href={phoneHref}
                  storeId={store.id}
                  kind="phone"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Phone className="h-4 w-4" /> Call
                </TrackedLink>
              )}
              {websiteHref && (
                <TrackedLink
                  href={websiteHref}
                  storeId={store.id}
                  kind="website"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Globe className="h-4 w-4" /> Website
                </TrackedLink>
              )}
              <div className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5">
                <StoreFavoriteButton storeId={store.id} initialFavorited={isFavorited} initialCount={favoriteCount ?? 0} />
              </div>
              {isOwner && (
                <Link
                  href={`/my/shops/${store.slug}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2.5 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/25 sm:ml-auto"
                >
                  <LayoutDashboard className="h-4 w-4" /> Shop dashboard
                </Link>
              )}
            </div>
          </div>

          {/* Tabs */}
          <nav
            aria-label="Shop page"
            className="flex gap-1 overflow-x-auto border-t border-white/10 px-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden"
          >
            {TABS.map((t) => (
              <Link
                key={t}
                href={tabHref(t)}
                scroll={false}
                aria-current={tab === t ? "page" : undefined}
                className={`relative shrink-0 px-4 py-3.5 text-sm font-medium transition-colors ${
                  tab === t ? "text-white" : "text-ocean-400 hover:text-white"
                }`}
              >
                {tabLabel[t]}
                {tab === t && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t-full bg-emerald-400" />}
              </Link>
            ))}
          </nav>
        </header>

        {/* ---- Posts (default) ---- */}
        {tab === "posts" && (
          <>
            <div className="mt-6 grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <section className={card}>
                  <h2 className="mb-3 flex items-center gap-2 font-display text-lg text-white">
                    <Info className="h-4 w-4 text-emerald-300" /> Intro
                  </h2>
                  <div className="mb-4 text-sm">{aboutText}</div>
                  {contactRows}
                </section>

                <StoreSpecialHours storeId={store.id} initial={specialDays} isOwner={false} />

                {allPhotos.length > 0 && (
                  <section className={card}>
                    <div className="mb-3 flex items-baseline justify-between">
                      <h2 className="font-display text-lg text-white">Photos</h2>
                      <Link href={tabHref("photos")} scroll={false} className="text-sm text-emerald-300 hover:text-emerald-200">
                        See all
                      </Link>
                    </div>
                    <ShopPhotoGrid photos={allPhotos} limit={9} storeName={store.name} />
                  </section>
                )}

                <section className={card}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <h2 className="flex items-center gap-2 font-display text-lg text-white">
                      <Star className="h-4 w-4 text-amber-300" /> Reviews
                    </h2>
                    <Link href={tabHref("reviews")} scroll={false} className="text-sm text-emerald-300 hover:text-emerald-200">
                      {ratingCount ? "Read all" : "Write one"}
                    </Link>
                  </div>
                  <Stars rating={ratingAvg} count={ratingCount} size={18} />
                  {ratingAvg != null && (
                    <p className="mt-1 text-sm text-ocean-400">
                      {ratingAvg.toFixed(1)} out of 5 from {ratingCount} review{ratingCount === 1 ? "" : "s"}
                    </p>
                  )}
                </section>

                <div>{directoryExtras}</div>
              </aside>

              <div className="min-w-0">
                <ShopTimeline
                  storeId={store.id}
                  storeName={store.name}
                  logoUrl={store.logo_url ?? null}
                  initial={timeline}
                  isOwner={isOwner}
                  currentUserId={user?.id ?? null}
                  emptyText={
                    claimed
                      ? `${store.name} hasn't posted anything yet.`
                      : `${store.name} hasn't claimed this page yet. If it's your shop, claim it free and post your restocks, sales and photos here.`
                  }
                />
              </div>
            </div>

            <div className="mt-10 space-y-10">
              {goodToKnow}
              {nearbySection}
            </div>
          </>
        )}

        {/* ---- Photos ---- */}
        {tab === "photos" && (
          <section className={`mt-6 ${card}`}>
            <h2 className="mb-4 font-display text-xl text-white">Photos from {store.name}</h2>
            {allPhotos.length > 0 ? (
              <ShopPhotoGrid photos={allPhotos} storeName={store.name} />
            ) : (
              <p className="py-8 text-center text-sm text-ocean-400">
                {isOwner
                  ? "No photos yet. Add some to a post on the Posts tab and they'll collect here."
                  : "No photos yet."}
              </p>
            )}
          </section>
        )}

        {/* ---- Reviews ---- */}
        {tab === "reviews" && (
          <div className="mx-auto mt-2 max-w-3xl">
            <div id="reviews" />
            <StoreReviews
              storeId={store.id}
              initialReviews={initialReviews}
              currentUserId={user?.id ?? null}
              currentUserName={currentUserName}
              isOwner={isOwner}
              claimHref={claimed ? null : `/stores/${store.slug}#claim`}
            />
          </div>
        )}

        {/* ---- About ---- */}
        {tab === "about" && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="min-w-0 space-y-6">
              <section className={card}>
                <h2 className="mb-3 font-display text-xl text-white">About {store.name}</h2>
                {aboutText}
              </section>
              {goodToKnow}
              {mapSection}
              {nearbySection}
            </div>
            <aside className="space-y-4">
              <section className={card}>
                <h2 className="mb-4 font-display text-lg text-white">Contact and hours</h2>
                {contactRows}
              </section>
              <StoreSpecialHours storeId={store.id} initial={specialDays} isOwner={false} />
              <div>{directoryExtras}</div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
