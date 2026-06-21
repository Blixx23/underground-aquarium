import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, ShieldCheck, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import DeleteAccountSection from "./DeleteAccountSection";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-xs font-mono tracking-widest text-ocean-500 uppercase mb-3">
          Your account
        </p>
        <h1 className="font-display text-3xl text-white mb-2">Account &amp; data</h1>
        <p className="text-ocean-400 mb-8">
          Signed in as <span className="text-ocean-200">{user.email}</span>.
        </p>

        {/* Download your data */}
        <section className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-6 mb-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ocean-800/60 text-ocean-300">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-white">Download your data</h2>
              <p className="mt-1 text-sm text-ocean-400">
                Get a copy of the personal information we hold about your
                account — your profile, tanks, listings, orders, and club
                memberships — as a JSON file.
              </p>
              <a
                href="/api/account/export"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-ocean-600"
              >
                <Download className="h-4 w-4" /> Download my data
              </a>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ocean-800/60 text-ocean-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-medium text-white">Privacy &amp; terms</h2>
              <p className="mt-1 text-sm text-ocean-400">
                Read how we handle your information and the terms you agreed to.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/privacy"
                  className="inline-flex items-center gap-2 rounded-full border border-ocean-700/70 px-4 py-2 text-sm text-ocean-200 transition-colors hover:border-ocean-600 hover:text-white"
                >
                  <FileText className="h-4 w-4" /> Privacy Policy
                </Link>
                <Link
                  href="/terms"
                  className="inline-flex items-center gap-2 rounded-full border border-ocean-700/70 px-4 py-2 text-sm text-ocean-200 transition-colors hover:border-ocean-600 hover:text-white"
                >
                  <FileText className="h-4 w-4" /> Terms of Service
                </Link>
              </div>
            </div>
          </div>
        </section>

        <DeleteAccountSection />
      </div>
    </main>
  );
}
