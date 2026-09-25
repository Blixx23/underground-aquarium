import { categoryLabel } from "@/lib/marketplace/categories";
import { formatPrice, type Listing } from "@/lib/marketplace/listings";

/**
 * Search-facing words for classifieds. People search "blue dream shrimp for
 * sale sacramento", not "Blue Dream Shrimp — $25", so titles lead with what
 * it is, then "for sale", then where.
 */

export const SITE = "https://www.undergroundaquarium.com";

type SeoListing = Pick<
  Listing,
  "slug" | "title" | "description" | "category" | "price_cents" | "is_free" | "is_wanted" | "condition" | "city" | "images" | "state_code" | "region_slug" | "created_at"
> & { expires_at?: string | null };

function place(l: SeoListing, regionName?: string | null): string {
  const town = l.city?.trim() || regionName || "";
  return town ? `${town}, ${l.state_code.toUpperCase()}` : l.state_code.toUpperCase();
}

export function listingSeoTitle(l: SeoListing, regionName?: string | null): string {
  const where = place(l, regionName);
  if (l.is_wanted) return `Wanted: ${l.title} in ${where}`;
  if (l.is_free || l.price_cents === 0) return `Free ${l.title} in ${where}`;
  const price = l.price_cents != null ? ` - ${formatPrice(l.price_cents)}` : "";
  return `${l.title} for Sale in ${where}${price}`;
}

export function listingSeoDescription(l: SeoListing, regionName?: string | null): string {
  const raw = (l.description ?? "").replace(/\s+/g, " ").trim();
  const where = place(l, regionName);
  const lead = l.is_wanted
    ? `Wanted in ${where}: ${l.title}.`
    : l.is_free || l.price_cents === 0
    ? `Free ${l.title} in ${where}.`
    : l.price_cents != null
    ? `${l.title} for sale in ${where}, ${formatPrice(l.price_cents)}.`
    : `${l.title} for sale in ${where}.`;
  const tail = raw ? ` ${raw}` : ` Local ${categoryLabel(l.category).toLowerCase()} from a hobbyist near you on Underground Aquarium.`;
  const text = `${lead}${tail}`;
  return text.length > 158 ? `${text.slice(0, 155).trimEnd()}…` : text;
}

function itemCondition(c: string | null): string | undefined {
  if (!c) return undefined;
  if (c === "new") return "https://schema.org/NewCondition";
  if (c === "for-parts") return "https://schema.org/DamagedCondition";
  return "https://schema.org/UsedCondition";
}

/** Product + Offer, so Google can show price and availability. Not for Wanted ads. */
export function listingProductJsonLd(l: SeoListing, regionName?: string | null) {
  if (l.is_wanted) return null;
  const url = `${SITE}/listing/${l.slug}`;
  const price = l.is_free ? 0 : l.price_cents != null ? l.price_cents / 100 : null;
  const images = (l.images ?? []).filter(Boolean);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: l.title,
    description: (l.description ?? "").trim() || `${l.title} in ${place(l, regionName)}`,
    ...(images.length ? { image: images } : {}),
    category: categoryLabel(l.category),
    url,
    ...(price != null
      ? {
          offers: {
            "@type": "Offer",
            url,
            price: price.toFixed(2),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
            ...(itemCondition(l.condition) ? { itemCondition: itemCondition(l.condition) } : {}),
            ...(l.expires_at ? { priceValidUntil: l.expires_at.slice(0, 10) } : {}),
            availableAtOrFrom: {
              "@type": "Place",
              address: {
                "@type": "PostalAddress",
                ...(l.city ? { addressLocality: l.city } : {}),
                addressRegion: l.state_code.toUpperCase(),
                addressCountry: "US",
              },
            },
          },
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

export function itemListJsonLd(listings: { slug: string; title: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: listings.slice(0, 50).map((l, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/listing/${l.slug}`,
      name: l.title,
    })),
  };
}

/** JSON for a <script type="application/ld+json">, safe against "</script>" in user text. */
export function ldJson(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
