import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import MyAlerts from "@/components/marketplace/MyAlerts";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My alerts",
  robots: { index: false, follow: false },
};

export default async function MyAlertsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen px-6 pb-20 pt-28">
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="mb-4 font-display text-2xl text-white">Sign in to see your alerts</h1>
          <Link href="/login?next=%2Fmy%2Falerts" className="inline-block rounded-xl bg-ocean-700 px-6 py-3 text-white transition-colors hover:bg-ocean-600">
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-6 pb-20 pt-28">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-2 flex items-center gap-3 font-display text-4xl text-white">
          <Bell className="h-8 w-8 text-emerald-300" /> My alerts
        </h1>
        <p className="mb-8 text-ocean-200">
          You get a bell, and an email unless you&apos;ve turned those off, when someone near you posts an ad that matches. Add an alert
          from any classifieds page.
        </p>
        <MyAlerts />
      </div>
    </main>
  );
}
