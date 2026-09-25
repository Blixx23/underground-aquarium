import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import BottomNav from "@/components/layout/BottomNav";
import Bubbles from "@/components/Bubbles";
import DailyHeartbeat from "@/components/DailyHeartbeat";
import TrophySync from "@/components/trophies/TrophySync";
import { Analytics } from "@vercel/analytics/next";

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
  openGraph: {
    title: "Buy, sell & trade aquarium fish and gear near you",
    description: "Free local classifieds for aquarium keepers. Live fish welcome.",
    url: "https://www.undergroundaquarium.com",
    siteName: "Underground Aquarium",
    type: "website",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Underground Aquarium, the hobbyist-first aquarium marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-default.png"],
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(SITE_JSON_LD) }}
        />
        <Bubbles />
        <DailyHeartbeat />
        <TrophySync />
        <Navbar />
        <div id="content">{children}</div>
        <Footer />
        <BottomNav />
        <Analytics />
      </body>
    </html>
  );
}
