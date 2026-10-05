import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { awardBubbles } from "@/lib/awardBubbles";

/**
 * After a species request, photo or breeding video is turned down: thank the
 * member, and (unless the admin unticked it, e.g. for spam) give them the
 * thank-you bubbles. Once per submission, however many times it runs.
 *
 * The database already sent "About your X photo: <reason>" a moment ago, so
 * the thanks is added to that same notice instead of sending a second one.
 * Never throws: the turn-down itself has already happened.
 */
export async function thankForSubmission({
  userId,
  kind,
  id,
  reason,
  giveBubbles,
}: {
  userId: string | null | undefined;
  kind: "request" | "photo" | "video";
  id: string;
  reason: string;
  giveBubbles: boolean;
}): Promise<number> {
  if (!userId) return 0;
  try {
    const amount = giveBubbles
      ? await awardBubbles(userId, "species_submission_thanks", `species_thanks_${kind}_${id}`, { notify: false })
      : 0;
    const thanks =
      amount > 0
        ? `Thanks for sending it in anyway. Here's +${amount} bubbles for helping build the library.`
        : "Thanks for sending it in anyway.";

    // The turn-down notice the database just wrote.
    const since = new Date(Date.now() - 2 * 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("notifications")
      .select("id, body")
      .eq("user_id", userId)
      .in("type", ["species_photo", "species_video", "species_request"])
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent?.id) {
      const body = (recent.body as string | null) ?? "";
      if (!body.includes("Thanks for sending it in")) {
        // Some turn-down notices leave the reason out; make sure it's there.
        const withReason = body.includes(reason) ? body : `${body}${body ? " " : ""}Why: ${reason}`;
        await supabaseAdmin.from("notifications").update({ body: `${withReason} ${thanks}` }).eq("id", recent.id);
      }
    } else {
      const what = kind === "request" ? "species request" : kind === "photo" ? "species photo" : "breeding video";
      await supabaseAdmin.from("notifications").insert({
        user_id: userId,
        type: kind === "request" ? "species_request" : kind === "photo" ? "species_photo" : "species_video",
        title: `About your ${what}`,
        body: `We didn't use this one: ${reason} ${thanks}`,
        link: "/species",
      });
    }
    return amount;
  } catch {
    return 0;
  }
}
