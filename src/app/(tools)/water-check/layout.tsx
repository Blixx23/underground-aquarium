import type { Metadata } from "next";
import type { ReactNode } from "react";
import { shareMeta } from "@/lib/seo/share";

export const metadata: Metadata = {
  title: "Water Check: What Your Aquarium Test Results Mean",
  description:
    "Enter your aquarium test results for ammonia, nitrite, nitrate, pH and more, and see in plain English what they mean for your fish and what to do next. Free.",
  alternates: { canonical: "/water-check" },
  ...shareMeta({ path: "/water-check", alt: "Water Check, a free aquarium water test reader" }),
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
