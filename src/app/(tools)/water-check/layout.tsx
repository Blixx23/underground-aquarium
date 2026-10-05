import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { shareMeta } from "@/lib/seo/share";
import { breadcrumbJsonLd, ldJson, SITE } from "@/lib/marketplace/seo";

const DESCRIPTION =
  "Enter your aquarium test results for ammonia, nitrite, nitrate, pH and more, and see in plain English what they mean for your fish and what to do next. Free.";

export const metadata: Metadata = {
  title: "Water Check: What Your Aquarium Test Results Mean",
  description: DESCRIPTION,
  alternates: { canonical: "/water-check" },
  ...shareMeta({ path: "/water-check", alt: "Water Check, a free aquarium water test reader" }),
};

// The questions people actually search after testing their water. Kept in the
// layout because the page is a client component; Google reads both.
const FAQ: { q: string; a: string }[] = [
  {
    q: "What should ammonia be in a fish tank?",
    a: "Zero. Any ammonia means waste is building up faster than your filter bacteria can handle it. A reading of 0.25 ppm calls for a 25 to 50% water change and lighter feeding. At 0.5 ppm or more, change 50% right away and again the next day if it's still there.",
  },
  {
    q: "What does nitrite in my aquarium mean?",
    a: "Nitrite is the middle step of the nitrogen cycle, and it should read zero in a cycled tank. Seeing it usually means the tank is still cycling or the filter was disturbed. It stops fish blood from carrying oxygen, so treat it like ammonia: water changes, less food, and no new fish until it reads zero.",
  },
  {
    q: "How high is too high for nitrate?",
    a: "Keep nitrate under 20 ppm if you can, and plan a water change once it passes 40. Above 80 ppm fish become chronically stressed. Bring very high nitrate down over a few smaller water changes rather than one huge one, since the sudden swing is hard on fish.",
  },
  {
    q: "What pH should my aquarium be?",
    a: "Most community fish do well between 6.5 and 7.8. Soft-water fish like tetras and rasboras prefer the lower end, and livebearers and African cichlids prefer the higher end. A steady pH matters more than a perfect number, so avoid chasing it with chemicals.",
  },
  {
    q: "What is the difference between GH and KH?",
    a: "GH (general hardness) is how much calcium and magnesium is in your water, which matters to soft-water and hard-water fish. KH (carbonate hardness) is the buffer that keeps your pH from swinging. A KH under 3 dKH means pH can drift or crash between water changes.",
  },
  {
    q: "How do I know when my tank is cycled?",
    a: "Your tank is cycled when ammonia and nitrite both read zero and nitrate is showing up, a day after you add an ammonia source. That usually takes 4 to 8 weeks for a new tank. Enter your readings here as you go to see where you are.",
  },
  {
    q: "Can I save my water tests?",
    a: "Yes. Sign in and pick one of your saved tanks to log a reading. Your tank keeps a dated history with a trend line for each value in the Tank Builder, and the check looks at your actual fish too.",
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  const app = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Water Check",
    url: `${SITE}/water-check`,
    description: DESCRIPTION,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    publisher: { "@type": "Organization", name: "Underground Aquarium", url: SITE },
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const crumbs = breadcrumbJsonLd([
    { name: "Home", path: "/" },
    { name: "Water Check", path: "/water-check" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(app) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(crumbs) }} />

      {children}

      <div className="mt-16 space-y-14 font-sans">
        <section>
          <h2 className="font-display text-2xl text-white sm:text-3xl">Water testing FAQ</h2>
          <div className="mt-5 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white">
                  <h3 className="text-[15px]">{f.q}</h3>
                  <span className="text-xl leading-none text-ocean-400 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-[15px] leading-relaxed text-ocean-200">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/10 to-sky-500/5 p-6">
          <h2 className="font-display text-xl text-white">Keep going</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href="/tank-builder" className="rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
              Plan your tank
            </Link>
            <Link href="/species" className="rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
              Browse fish species
            </Link>
            <Link href="/glossary" className="rounded-full border border-white/15 px-4 py-2 text-white hover:bg-white/10">
              Aquarium glossary
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
