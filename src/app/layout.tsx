import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Bubbles from "@/components/Bubbles";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.undergroundaquarium.com"),
  title: {
    default: "UndergroundAquarium — The Hobbyist-First Aquarium Marketplace",
    template: "%s | UndergroundAquarium",
  },
  description:
    "Buy, sell, and connect with aquarium enthusiasts. Rare plants, equipment, 3D-printed gear, and a vibrant community — all in one place.",
  keywords: ["aquarium", "fish", "marketplace", "freshwater", "plants", "aquatic", "hobbyist"],
  openGraph: {
    title: "UndergroundAquarium — The Hobbyist-First Aquarium Marketplace",
    description: "Buy, sell, and connect with aquarium enthusiasts.",
    url: "https://www.undergroundaquarium.com",
    siteName: "UndergroundAquarium",
    type: "website",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "UndergroundAquarium — The Hobbyist-First Aquarium Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og-default.png"],
  },
  robots: { index: true, follow: true },
};

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
        <Bubbles />
        <Navbar />
        <main>{children}</main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
