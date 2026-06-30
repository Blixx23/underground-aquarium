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
} from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";
import ClaimStore from "../ClaimStore";
import EditStore from "../EditStore";
import StoreReviews from "../StoreReviews";
import StorePosts from "../StorePosts";
import StoreFavoriteButton from "@/components/StoreFavoriteButton";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

type StoreRow = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  website: string | null;
  hours: string | null;
  description: string | null;
  tags: string[] | null;
  claimed_by: string | null;
};

async function getStore(slug: string) {
  const { data } = await supabasePublic
    .from("fish_stores")
    .select(
      "id, slug, name, address, city, state, phone, website, hours, description, tags, claimed_by"
    )
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
  return {
    title: place ? `${store.name} — ${place}` : store.name,
    description:
      store.description ??
      `Visit ${store.name}, a local aquarium store${place ? ` in ${place}` : ""}.`,
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
  const { data: postRows } = await supabasePublic
    .from("store_posts")
    .select("id,title,body,images,created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
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
    images: p.images,
    createdAt: p.created_at,
  }));

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

  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/stores"
            className="inline-flex items-center gap-2 text-ocean-300 hover:text-white transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> All fish stores
          </Link>
        </div>

        <EditStore
          store={{
            id: store.id,
            address: store.address,
            city: store.city,
            state: store.state,
            phone: store.phone,
            website: store.website,
            hours: store.hours,
            description: store.description,
            tags: store.tags,
          }}
          isOwner={isOwner}
        />

        <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
          Local Fish Store
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-white mb-2">
          {store.name}
        </h1>
        {place && (
          <p className="text-ocean-300 flex items-center gap-1.5 mb-4">
            <MapPin className="w-4 h-4 shrink-0" />
            {store.address ? `${store.address}, ${place}` : place}
          </p>
        )}

        {store.tags && store.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {store.tags.map((t) => (
              <span
                key={t}
                className="text-[11px] uppercase tracking-wide text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 rounded px-2 py-0.5"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        {store.description && (
          <p className="text-ocean-200 leading-relaxed mb-8">
            {store.description}
          </p>
        )}

        <div className="space-y-3 mb-8">
          {store.hours && (
            <div className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3">
              <Clock className="w-4 h-4 text-ocean-400 mt-0.5 shrink-0" />
              <p className="text-ocean-200 text-sm whitespace-pre-wrap">
                {store.hours}
              </p>
            </div>
          )}
          {phoneHref && (
            <Link
              href={phoneHref}
              className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:border-emerald-500/40 transition-colors"
            >
              <Phone className="w-4 h-4 text-ocean-400 shrink-0" />
              <span className="text-ocean-200 text-sm">{store.phone}</span>
            </Link>
          )}
          {websiteHref && (
            <Link
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 hover:border-emerald-500/40 transition-colors"
            >
              <Globe className="w-4 h-4 text-ocean-400 shrink-0" />
              <span className="text-ocean-200 text-sm truncate">
                {websiteLabel}
              </span>
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-5 py-3 text-sm font-medium hover:bg-emerald-500/25 transition-colors"
          >
            <Navigation className="w-4 h-4" /> Get directions
          </Link>
          <StoreFavoriteButton
            storeId={store.id}
            initialFavorited={isFavorited}
            initialCount={favoriteCount ?? 0}
          />
        </div>

        <StorePosts
          storeId={store.id}
          initialPosts={initialPosts}
          isOwner={isOwner}
          currentUserId={user?.id ?? null}
        />

        <StoreReviews
          storeId={store.id}
          initialReviews={initialReviews}
          currentUserId={user?.id ?? null}
          currentUserName={currentUserName}
          isOwner={isOwner}
        />

        <ClaimStore
          storeId={store.id}
          storeName={store.name}
          claimed={!!store.claimed_by}
        />
      </div>
    </main>
  );
}