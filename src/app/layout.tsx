import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: {
    default: "UndergroundAquarium — The Hobbyist-First Aquarium Marketplace",
    template: "%s | UndergroundAquarium",
  },
  description:
    "Buy, sell, and connect with aquarium enthusiasts. Live fish, rare plants, 3D-printed gear, and a vibrant community — all in one place.",
  keywords: ["aquarium", "fish", "marketplace", "freshwater", "plants", "aquatic", "hobbyist"],
  openGraph: {
    title: "UndergroundAquarium — The Hobbyist-First Aquarium Marketplace",
    description: "Buy, sell, and connect with aquarium enthusiasts.",
    url: "https://undergroundaquarium.com",
    siteName: "UndergroundAquarium",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
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
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
