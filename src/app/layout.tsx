import type { Metadata, Viewport } from "next";
import { Cinzel_Decorative, Crimson_Pro, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import Bubbles from "@/components/Bubbles";
import DailyHeartbeat from "@/components/DailyHeartbeat";
import TrophySync from "@/components/trophies/TrophySync";
import SiteAnalytics from "@/components/SiteAnalytics";
import NavProgress from "@/components/NavProgress";

// Fonts are downloaded at build time and served from our own domain, so the
// page never waits on Google Fonts before it can show text.
const display = Cinzel_Decorative({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cinzel",
});
const body = Crimson_Pro({
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-crimson",
});
const mono = JetBrains_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#020b18",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.undergroundaquarium.com"),
  title: {
    default: "Buy, Sell & Trade Aquarium Fish Near You | Underground Aquarium",
    // Two words, the way people search for us.
    template: "%s | Underground Aquarium",
  },
  description:
    "Free local classifieds for aquarium keepers. Buy, sell and trade live fish, shrimp, snails, plants, coral, tanks and gear with people near you. No fees, no commission.",
  keywords: ["aquarium classifieds", "buy fish near me", "sell aquarium fish", "aquarium fish for sale", "aquatic plants for sale", "shrimp for sale", "aquarium trade"],
  // No title, description or url here on purpose: every page's own title and
  // description fill those in, so a shared link shows what was shared rather
  // than the homepage. Pages with a picture of their own set it with shareMeta().
  openGraph: {
    siteName: "Underground Aquarium",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Underground Aquarium, the hobbyist-first aquarium marketplace",
      },
    ],
  },
  // The picture comes from openGraph, so a page's own picture shows on X too.
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
};

// Tells Google who we are, so a search for "underground aquarium" finds us
// and the result shows our name instead of the bare domain.
const SITE_JSON_LD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": "https://www.undergroundaquarium.com/#website",
    name: "Underground Aquarium",
    alternateName: ["UndergroundAquarium", "UndergroundAquarium.com"],
    url: "https://www.undergroundaquarium.com/",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://www.undergroundaquarium.com/#organization",
    name: "Underground Aquarium",
    url: "https://www.undergroundaquarium.com/",
    logo: "https://www.undergroundaquarium.com/icon-512.png",
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
        <NavProgress />
        <Bubbles />
        <DailyHeartbeat />
        <TrophySync />
        <Navbar />
        <div id="content">{children}</div>
        <Footer />
        <BottomNav />
        <SiteAnalytics />
      </body>
    </html>
  );
}
