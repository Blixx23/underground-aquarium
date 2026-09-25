import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MapPin,
  Eye,
  Clock,
  Mail,
  Phone,
  MessageCircle,
  Pencil,
  MessageSquareText,
  ChevronRight,
  Fish,
} from "lucide-react";
import { formatPhone, smsHref, telHref } from "@/lib/phone";
import MarkSoldButton from "@/components/marketplace/MarkSoldButton";
import { createClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";
import { categoryLabel } from "@/lib/marketplace/categories";
import {
  formatPrice,
  conditionLabel,
  timeAgo,
  LISTING_COLUMNS,
  listingHref,
  type Listing,
} from "@/lib/marketplace/listings";
import {
  breadcrumbJsonLd,
  ldJson,
  listingProductJsonLd,
  listingSeoDescription,
  listingSeoTitle,
} from "@/lib/marketplace/seo";
import ListingGallery from "@/components/marketplace/ListingGallery";
import ReportButton from "@/components/ReportButton";
import SocietySeal from "@/components/society/SocietySeal";
import { MESSAGING_ENABLED, MY_LISTINGS_ENABLED } from "@/lib/config";

type ListingRow = {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string;
  price_cents: number | null;
  is_free: boolean;
  is_wanted: boolean;
  condition: string | null;
  city: string | null;
  images: string[] | null;
  state_code: string;
  region_slug: string;
  status: string;
  views: number;
  bumped_at: string;
  created_at: string;
  expires_at: string;
  allow_messages: boolean;
  show_email: boolean;
  contact_email: string | null;
  contact_phone: string | null;
};

const DETAIL_COLUMNS = `${LISTING_COLUMNS}, user_id, status, expires_at, allow_messages, show_email, contact_email, contact_phone`;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  // Session-aware, like the page: an owner can still open their own draft
  // or sold ad, everyone else gets a real 404. Deciding here, before the page
  // streams, is what gives search engines a true 404 instead of a soft one.
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select(`${LISTING_COLUMNS}, expires_at, status`)
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();

  const l = data as unknown as Listing & { expires_at: string | null; status: string };
  if (l.status !== "active") return { title: l.title, robots: { index: false, follow: false } };
  const { data: regionRow } = await supabasePublic
    .from("market_regions")
    .select("name")
    .eq("state_code", l.state_code)
    .eq("slug", l.region_slug)
    .maybeSingle();
  const regionName = (regionRow?.name as string | undefined) ?? null;

  const title = listingSeoTitle(l, regionName);
  const description = listingSeoDescription(l, regionName);

  return {
    title,
    description,
    alternates: { canonical: `/listing/${slug}` },
    openGraph: {
      title,
      description,
      url: `/listing/${slug}`,
      type: "website",
      images: [l.images?.[0] ?? "/og-default.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [l.images?.[0] ?? "/og-default.png"],
    },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Session-aware on purpose: RLS lets an owner see their own draft or
  // expired listing here, while everyone else only sees live ones.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("listings")
    .select(DETAIL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (!data) notFound();
  const listing = data as unknown as ListingRow;

  const isOwner = !!user && user.id === listing.user_id;
  if (listing.status !== "active" && !isOwner) notFound();

  const nowIso = new Date().toISOString();
  const [{ data: sellerData }, { data: regionData }, { data: sealData }, { data: nearbyData }, { data: stateData }] = await Promise.all([
    supabasePublic
      .from("profiles")
      .select("username, full_name")
      .eq("id", listing.user_id)
      .maybeSingle(),
    supabasePublic
      .from("market_regions")
      .select("name, state_name")
      .eq("state_code", listing.state_code)
      .eq("slug", listing.region_slug)
      .maybeSingle(),
    supabasePublic.rpc("society_members_among", { p_users: [listing.user_id] }),
    // More of the same nearby: the best internal links a listing can have.
    supabasePublic
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("state_code", listing.state_code)
      .eq("region_slug", listing.region_slug)
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .neq("id", listing.id)
      .order("bumped_at", { ascending: false })
      .limit(12),
    supabasePublic
      .from("listings")
      .select(LISTING_COLUMNS)
      .eq("state_code", listing.state_code)
      .eq("category", listing.category)
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .neq("id", listing.id)
      .order("bumped_at", { ascending: false })
      .limit(6),
  ]);
  const sellerIsSociety = Array.isArray(sealData) && sealData.length > 0;

  const seller = sellerData as { username: string | null; full_name: string | null } | null;
  const region = regionData as { name: string; state_name: string } | null;

  const images = listing.images ?? [];
  const condition = conditionLabel(listing.condition);
  const regionUrl = `/marketplace/${listing.state_code.toLowerCase()}/${listing.region_slug}`;
  const sellerName = seller?.full_name?.trim() || seller?.username || "A hobbyist";

  // Same category nearby first, then anything nearby, then same category in the state.
  const nearby = (nearbyData ?? []) as unknown as Listing[];
  const sameState = (stateData ?? []) as unknown as Listing[];
  const seen = new Set<string>();
  const related: Listing[] = [];
  for (const l of [
    ...nearby.filter((n) => n.category === listing.category),
    ...nearby,
    ...sameState,
  ]) {
    if (related.length >= 6 || seen.has(l.id)) continue;
    seen.add(l.id);
    related.push(l);
  }

  const stateUrl = `/marketplace/${listing.state_code.toLowerCase()}`;
  const crumbs = [
    { name: "Marketplace", path: "/marketplace" },
    { name: region?.state_name ?? listing.state_code.toUpperCase(), path: stateUrl },
    ...(region ? [{ name: region.name, path: regionUrl }] : []),
    { name: listing.title, path: `/listing/${listing.slug}` },
  ];
  const productLd =
    listing.status === "active" ? listingProductJsonLd(listing, region?.name ?? null) : null;

  // The three ways a buyer can reach this poster, worked out once so the
  // owner preview and the buyer view can never disagree.
  const messagingOn = MESSAGING_ENABLED;
  const emailShown = listing.show_email && !!listing.contact_email;
  const canBeContacted =
    messagingOn || emailShown || !!listing.contact_phone;

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-5xl mx-auto">
        {productLd && (
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(productLd) }} />
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbJsonLd(crumbs)) }} />

        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-ocean-500">
            <li>
              <Link href={regionUrl} className="inline-flex items-center gap-1.5 text-ocean-400 hover:text-white transition-colors sm:hidden">
                <ArrowLeft className="w-4 h-4" />
                {region ? region.name : "Marketplace"}
              </Link>
            </li>
            {crumbs.slice(0, -1).map((c, i) => (
              <li key={c.path} className="hidden sm:inline-flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-ocean-700" />}
                <Link href={c.path} className="text-ocean-400 hover:text-white transition-colors">
                  {c.name}
                </Link>
              </li>
            ))}
          </ol>
        </nav>

        {isOwner && listing.status !== "active" && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 mb-8">
            <p className="text-sm text-amber-200">
              This listing is <strong>{listing.status}</strong>, so only you can
              see it. Publish it from My Listings to put it in front of buyers.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Photos */}
          <div className="lg:col-span-3">
            <ListingGallery
              listingId={listing.id}
              images={images}
              title={listing.title}
              countView={!isOwner && listing.status === "active"}
            />
          </div>

          {/* Details */}
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="text-[11px] font-medium uppercase tracking-wide text-ocean-200 bg-ocean-900/70 border border-ocean-800/60 rounded-full px-3 py-1">
                {categoryLabel(listing.category)}
              </span>
              {listing.is_wanted && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-300 bg-sky-500/15 border border-sky-500/30 rounded-full px-3 py-1">
                  Wanted
                </span>
              )}
              {!listing.is_wanted && listing.is_free && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 rounded-full px-3 py-1">
                  Free
                </span>
              )}
            </div>

            <h1 className="font-display text-3xl text-white leading-tight mb-3">
              {listing.title}
            </h1>

            {!listing.is_wanted && (
              <p className="font-display text-3xl text-ocean-200 mb-6">
                {formatPrice(listing.price_cents)}
              </p>
            )}

            <div className="space-y-2.5 text-sm text-ocean-400 mb-7">
              <p className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-ocean-600" />
                <Link href={regionUrl} className="hover:text-white transition-colors">
                  {listing.city ? `${listing.city} · ` : ""}
                  {region?.name ?? listing.region_slug}
                </Link>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-ocean-600" />
                Posted {timeAgo(listing.created_at)}
              </p>
              {listing.views > 0 && (
                <p className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-ocean-600" />
                  {listing.views} {listing.views === 1 ? "view" : "views"}
                </p>
              )}
              {condition && (
                <p className="text-ocean-400">
                  <span className="text-ocean-600">Condition:</span> {condition}
                </p>
              )}
            </div>

            {/* Contact */}
            <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 mb-6">
              <p className="text-sm text-ocean-300 mb-1">
                Posted by{" "}
                {seller?.username ? (
                  <Link
                    href={`/u/${seller.username}`}
                    className={`transition-colors ${
                      "text-white hover:text-ocean-200"
                    }`}
                  >
                    {sellerName}
                  </Link>
                ) : (
                  <span className="text-white">{sellerName}</span>
                )}
                {sellerIsSociety && (
                  <span
                    title="Underground Aquarium Society member"
                    className="ml-1.5 inline-flex translate-y-[3px] items-center"
                  >
                    <SocietySeal size={16} className="h-4 w-4" />
                  </span>
                )}
              </p>

              {isOwner ? (
                <>
                  {/* You can't message yourself, so say plainly how buyers
                      will be reaching you instead. */}
                  <div className="mt-4 rounded-xl border border-ocean-800/60 bg-ocean-950/50 p-4">
                    <p className="text-ocean-100 mb-1">This is your listing.</p>
                    <p className="text-sm text-ocean-400">
                      Buyers contact you by messaging you here, and it lands in
                      your inbox.
                    </p>

                    {(emailShown || listing.contact_phone) && (
                      <>
                        <p className="mt-4 text-xs text-ocean-500">
                          You also chose to show:
                        </p>
                        <ul className="mt-2 space-y-2 text-sm">
                          {emailShown && (
                            <li className="flex items-center gap-2 text-ocean-200">
                              <Mail className="w-4 h-4 shrink-0 text-ocean-500" />
                              <span className="break-all">
                                {listing.contact_email}
                              </span>
                            </li>
                          )}
                          {listing.contact_phone && (
                            <li className="flex items-center gap-2 text-ocean-200">
                              <Phone className="w-4 h-4 shrink-0 text-ocean-500" />
                              {formatPhone(listing.contact_phone)}
                            </li>
                          )}
                        </ul>
                      </>
                    )}
                  </div>

                  {listing.status === "active" && (
                    <MarkSoldButton listingId={listing.id} isWanted={listing.is_wanted} />
                  )}

                  {MY_LISTINGS_ENABLED ? (
                    <Link
                      href="/my/listings"
                      className="mt-3 inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl border border-ocean-700/60 text-ocean-200 hover:text-white hover:border-ocean-600 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                      Manage this listing
                    </Link>
                  ) : (
                    <p className="mt-3 inline-flex items-center gap-2 text-sm text-ocean-500">
                      <Pencil className="w-4 h-4" />
                      This is your listing.
                    </p>
                  )}
                </>
              ) : (
                <>
                  {messagingOn && (
                    <Link
                      href={`/messages/new?listing=${listing.slug}`}
                      className="mt-4 inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white font-medium transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Message {seller ? sellerName.split(" ")[0] : "the seller"}
                    </Link>
                  )}

                  {emailShown || listing.contact_phone ? (
                    <div className="mt-4 space-y-2 text-sm">
                      {emailShown && (
                        <a
                          href={`mailto:${listing.contact_email}?subject=${encodeURIComponent(listing.title)}`}
                          className="flex items-center gap-2 text-ocean-300 hover:text-white transition-colors break-all"
                        >
                          <Mail className="w-4 h-4 shrink-0 text-ocean-600" />
                          {listing.contact_email}
                        </a>
                      )}
                      {listing.contact_phone && (
                        <div className="rounded-xl border border-ocean-800/60 bg-ocean-950/50 p-3">
                          <p className="mb-2.5 flex items-center gap-2 text-ocean-200">
                            <Phone className="w-4 h-4 shrink-0 text-ocean-500" />
                            <span className="font-medium tracking-wide">{formatPhone(listing.contact_phone)}</span>
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            <a
                              href={telHref(listing.contact_phone)}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2.5 font-medium text-emerald-200 ring-1 ring-emerald-400/30 transition-colors hover:bg-emerald-500/25"
                            >
                              <Phone className="w-4 h-4" /> Call
                            </a>
                            <a
                              href={smsHref(
                                listing.contact_phone,
                                `Hi, is your "${listing.title}" on Underground Aquarium still available?`
                              )}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500/15 px-3 py-2.5 font-medium text-sky-200 ring-1 ring-sky-400/30 transition-colors hover:bg-sky-500/25"
                            >
                              <MessageSquareText className="w-4 h-4" /> Text
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {!canBeContacted && (
                      <p className="mt-4 text-sm text-ocean-500">
                        This poster didn&apos;t leave a way to contact them.
                      </p>
                    )}
                </>
              )}
            </div>

            <p className="text-xs text-ocean-600 leading-relaxed">
              Underground Aquarium doesn&apos;t handle payment or shipping for
              classified ads. Meet somewhere public, inspect livestock before you
              pay, and never wire money to someone you haven&apos;t met. See the{" "}
              <Link href="/rules" className="underline hover:text-ocean-300">
                listing rules
              </Link>
              .
            </p>

            {!isOwner && (
              <ReportButton
                targetType="listing"
                targetId={listing.id}
                targetLabel={listing.title}
                targetUrl={`/listing/${listing.slug}`}
                className="mt-5"
              />
            )}
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <section className="mt-12 pt-8 border-t border-ocean-900/70 max-w-3xl">
            <h2 className="font-display text-xl text-white mb-4">Details</h2>
            <p className="text-ocean-300 leading-relaxed whitespace-pre-wrap">
              {listing.description}
            </p>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-14 pt-8 border-t border-ocean-900/70">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
              <h2 className="font-display text-xl text-white">
                More {categoryLabel(listing.category).toLowerCase()} near {region?.name ?? "you"}
              </h2>
              <Link href={regionUrl} className="text-sm text-ocean-400 hover:text-white transition-colors">
                See all in {region?.name ?? "this area"} →
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={listingHref(r.slug)}
                  className="group block overflow-hidden rounded-xl border border-ocean-800/60 bg-ocean-900/50 hover:border-ocean-600/70 transition-colors"
                >
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-ocean-800 to-ocean-950 flex items-center justify-center overflow-hidden">
                    {r.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.images[0]}
                        alt={r.title}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <Fish className="w-8 h-8 text-ocean-700" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm text-white leading-snug line-clamp-2">{r.title}</p>
                    <p className="mt-1 text-xs text-ocean-400">
                      {r.is_wanted ? "Wanted" : formatPrice(r.price_cents)}
                      {r.city ? ` · ${r.city}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
