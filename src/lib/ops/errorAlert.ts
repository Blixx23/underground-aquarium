import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SUPPORT_EMAIL } from "@/lib/email/provider";
import { dispatchOne } from "@/lib/email/queue";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Emails the support inbox when a page or API breaks, so Chris hears about it
 * before a member does. No outside service: it rides the site's own email
 * queue. The same error on the same page is sent at most once an hour, across
 * every server, by checking what the queue already sent. Never throws.
 */
export async function alertSiteError(args: {
  where: string; // the page or API path
  message: string;
  source: "server" | "browser";
  digest?: string | null;
  detail?: string | null;
}): Promise<void> {
  try {
    if (!SUPPORT_EMAIL) return;
    const message = args.message.slice(0, 300) || "Unknown error";
    const subject = `Site error: ${args.where.slice(0, 80)}: ${message.slice(0, 90)}`;

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("email_queue")
      .select("id", { count: "exact", head: true })
      .eq("kind", "email_alert")
      .eq("subject", subject)
      .gte("created_at", since);
    if ((count ?? 0) > 0) return;

    await dispatchOne({
      kind: "email_alert",
      to: SUPPORT_EMAIL,
      ignorePause: true,
      subject,
      html: `<p><strong>${args.source === "server" ? "A page or API failed on the server." : "A page crashed in a visitor's browser."}</strong></p>
             <p>Where: <a href="https://www.undergroundaquarium.com${esc(args.where)}">${esc(args.where)}</a></p>
             <p>Error: ${esc(message)}</p>
             ${args.digest ? `<p>Vercel log id: ${esc(args.digest)} (search it in Vercel → Logs)</p>` : ""}
             ${args.detail ? `<pre style="white-space:pre-wrap;font-size:12px">${esc(args.detail.slice(0, 2000))}</pre>` : ""}
             <p>The same error on this page won't be emailed again for an hour.</p>`,
      context: { where: args.where, source: args.source },
    });
  } catch {
    // An alert must never become a second error.
  }
}
