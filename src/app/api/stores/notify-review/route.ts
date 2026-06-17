import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(request: Request) {
  try {
    const { reviewId } = await request.json();
    if (!reviewId || typeof reviewId !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const { data: review } = await supabaseAdmin
      .from("store_reviews")
      .select("id, store_id, user_id, rating, body, created_at")
      .eq("id", reviewId)
      .maybeSingle();
    if (!review) return NextResponse.json({ ok: true });

    // Only notify for very recent reviews (guards against replays)
    const ageMs = Date.now() - new Date(review.created_at as string).getTime();
    if (ageMs > 10 * 60 * 1000) return NextResponse.json({ ok: true });

    const { data: store } = await supabaseAdmin
      .from("fish_stores")
      .select("name, slug, claimed_by")
      .eq("id", review.store_id)
      .maybeSingle();
    if (!store || !store.claimed_by) return NextResponse.json({ ok: true });

    const { data: ownerData } = await supabaseAdmin.auth.admin.getUserById(
      store.claimed_by as string
    );
    const ownerEmail = ownerData?.user?.email;
    if (!ownerEmail) return NextResponse.json({ ok: true });

    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("username, full_name")
      .eq("id", review.user_id)
      .maybeSingle();
    const reviewerName =
      (prof?.full_name as string) ||
      (prof?.username as string) ||
      "An aquarist";

    const rating = review.rating as number;
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    const snippet = review.body
      ? String(review.body).slice(0, 300)
      : "(no written review)";
    const url = `https://www.undergroundaquarium.com/stores/${store.slug}`;

    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: "Underground Aquarium <orders@send.undergroundaquarium.com>",
      to: ownerEmail,
      subject: `New ${rating}-star review for ${store.name}`,
      html: `
        <div style="font-family: sans-serif; line-height: 1.5; color: #0f172a;">
          <p><strong>${esc(reviewerName)}</strong> left a new review for <strong>${esc(
            store.name as string
          )}</strong>.</p>
          <p style="font-size: 18px; color: #f59e0b; margin: 8px 0;">${stars} (${rating}/5)</p>
          <p style="white-space: pre-wrap; background:#f1f5f9; padding:12px; border-radius:8px;">${esc(
            snippet
          )}</p>
          <p><a href="${url}" style="color:#059669;">View it and respond &rarr;</a></p>
          <p style="color:#64748b; font-size:12px;">You're receiving this because you manage this listing on Underground Aquarium.</p>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}