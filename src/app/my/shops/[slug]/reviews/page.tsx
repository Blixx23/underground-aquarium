import type { Metadata } from "next";
import { requireOwnedStore } from "@/lib/stores/owner";
import StoreReviews from "@/app/stores/StoreReviews";

export const metadata: Metadata = { title: "Shop reviews" };
export const dynamic = "force-dynamic";

export default async function ShopReviewsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { store, supabase, user } = await requireOwnedStore(slug);

  const { data: reviewRows } = await supabase
    .from("store_reviews")
    .select("id, user_id, rating, body, created_at")
    .eq("store_id", store.id)
    .order("created_at", { ascending: false });
  const reviews = (reviewRows ?? []) as {
    id: string;
    user_id: string;
    rating: number;
    body: string | null;
    created_at: string;
  }[];

  const ids = [...new Set(reviews.map((r) => r.user_id))];
  const names = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("id, username, full_name").in("id", ids);
    for (const p of (profs ?? []) as { id: string; username: string | null; full_name: string | null }[]) {
      names.set(p.id, p.full_name?.trim() || p.username || "Aquarist");
    }
  }

  const { data: responses } = await supabase
    .from("review_responses")
    .select("review_id, body")
    .in("review_id", reviews.map((r) => r.id).length ? reviews.map((r) => r.id) : ["00000000-0000-0000-0000-000000000000"]);
  const respByReview = new Map(
    ((responses ?? []) as { review_id: string; body: string }[]).map((r) => [r.review_id, r.body])
  );

  const { data: me } = await supabase.from("profiles").select("full_name, username").eq("id", user.id).maybeSingle();

  return (
    <div>
      <p className="mb-4 text-sm text-ocean-400">
        A short, friendly reply to every review is the cheapest advertising there is. The reviewer gets
        a notification when you answer.
      </p>
      <StoreReviews
        storeId={store.id}
        initialReviews={reviews.map((r) => ({
          id: r.id,
          userId: r.user_id,
          authorName: names.get(r.user_id) || "Aquarist",
          rating: r.rating,
          body: r.body,
          createdAt: r.created_at,
          response: respByReview.get(r.id) ?? null,
        }))}
        currentUserId={user.id}
        currentUserName={me?.full_name || me?.username || null}
        isOwner
      />
    </div>
  );
}
