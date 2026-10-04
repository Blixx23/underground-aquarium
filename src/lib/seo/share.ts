import type { Metadata } from "next";

/**
 * What a shared link shows on Facebook, iMessage, X and the rest.
 *
 * The page's own title and description fill in og:title and og:description
 * automatically (the root layout deliberately leaves them out), so a page
 * only needs to say which picture to show and its own address.
 */

/** Our designed card for a page, drawn by /api/share-card from the page's own data. */
export function shareCardUrl(path: string): string {
  return `/api/share-card?path=${encodeURIComponent(path)}`;
}

type ShareOpts = {
  /** The page's path, e.g. /courses/nitrogen-cycle. Becomes og:url. */
  path: string;
  /** A real photo or cover. Leave out to use our designed card for this page. */
  image?: string | null;
  /** Alt text for the picture. */
  alt: string;
  /** Set when the picture isn't 1200x630 (a 16:9 course cover, say). */
  width?: number;
  height?: number;
  type?: "website" | "article";
};

export function shareMeta({ path, image, alt, width, height, type = "website" }: ShareOpts): Pick<Metadata, "openGraph" | "twitter"> {
  const url = image || shareCardUrl(path);
  const isCard = !image;
  const img = {
    url,
    alt,
    ...(isCard ? { width: 1200, height: 630 } : width && height ? { width, height } : {}),
  };
  return {
    openGraph: {
      url: path,
      siteName: "Underground Aquarium",
      type,
      locale: "en_US",
      images: [img],
    },
    twitter: {
      card: "summary_large_image",
      images: [url],
    },
  };
}
