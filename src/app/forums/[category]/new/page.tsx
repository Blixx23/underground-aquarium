import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabasePublic } from "@/lib/supabase/public";
import NewThreadForm from "@/components/forum/NewThreadForm";

export const metadata: Metadata = {
  title: "New post",
  robots: { index: false, follow: false },
};

type Params = { params: Promise<{ category: string }> };

export default async function NewThreadPage({ params }: Params) {
  const { category } = await params;

  const { data: cat } = await supabasePublic
    .from("forum_categories")
    .select("slug, name, is_public")
    .eq("slug", category)
    .maybeSingle();
  if (!cat || !cat.is_public) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/forums/${category}`}
          className="inline-flex items-center gap-1.5 text-sm text-ocean-400 hover:text-ocean-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {cat.name}
        </Link>
        <h1 className="font-display text-3xl text-white mb-6">
          New post in {cat.name}
        </h1>
        <NewThreadForm category={cat.slug} />
      </div>
    </main>
  );
}
