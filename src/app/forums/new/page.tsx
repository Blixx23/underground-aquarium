import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";
import NewThreadForm from "@/components/forum/NewThreadForm";

export const metadata: Metadata = {
  title: "Ask the forums",
  robots: { index: false, follow: false },
};

/** A new post from anywhere on the site: pick the section right in the form. */
export default async function NewForumPostPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const { section } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/forums/new");

  const { data: cats } = await supabasePublic
    .from("forum_categories")
    .select("slug, name")
    .eq("is_public", true)
    .order("sort_order", { ascending: true });
  const choices = (cats ?? []).map((c) => ({ slug: c.slug as string, name: c.name as string }));
  const preset = choices.some((c) => c.slug === section) ? section : "";

  return (
    <main className="min-h-screen px-6 pb-20 pt-28">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/forums"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-ocean-400 transition-colors hover:text-ocean-200"
        >
          <ArrowLeft className="h-4 w-4" /> Forums
        </Link>
        <h1 className="mb-6 font-display text-3xl text-white">Ask the forums</h1>
        <NewThreadForm category={preset} choices={choices} />
      </div>
    </main>
  );
}
