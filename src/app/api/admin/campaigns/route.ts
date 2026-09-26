import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchOne } from "@/lib/email/queue";
import { getCampaign, runCampaign, type Step } from "@/lib/campaigns/planner";
import { previewLine, renderBody, renderSubject, varsForStore } from "@/lib/campaigns/render";
import { factsFor, subjectHook, whatsHappening, whatsMissing } from "@/lib/campaigns/facts";
import { claimToken } from "@/lib/stores/claimToken";
import { SITE } from "@/lib/email/queue";
import { suppress } from "@/lib/email/suppress";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  action?: string;
  key?: string;
  repeatDays?: number;
  stepId?: string;
  step?: number;
  enrollmentId?: string;
  active?: boolean;
  /** An address, or a bare domain for every address at that shop. */
  target?: string;
  patch?: { subject?: string; body?: string; cta_label?: string; cta_url?: string; delay_days?: number; active?: boolean };
};

/** A real shop to preview against, never invented sample copy. */
async function previewStore() {
  const { data } = await supabaseAdmin
    .from("fish_stores")
    .select("id, slug, name, city, state")
    .is("claimed_by", null)
    .not("slug", "is", null)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as { id: string; slug: string; name: string; city: string | null; state: string | null } | null;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) return NextResponse.json({ error: "Admins only." }, { status: 403 });

  try {
    switch (body.action) {
      // Turning a campaign on only means the planner will consider it.
      // The email kill switch still sits above this.
      case "toggle": {
        if (!body.key) return NextResponse.json({ error: "Which campaign?" }, { status: 400 });
        const { error } = await supabaseAdmin
          .from("email_campaigns")
          .update({ active: Boolean(body.active), updated_at: new Date().toISOString() })
          .eq("key", body.key);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      // How often the whole thing comes back around. 0 turns repeating off.
      case "set-interval": {
        if (!body.key) return NextResponse.json({ error: "Which campaign?" }, { status: 400 });
        const n = Math.trunc(Number(body.repeatDays));
        if (!Number.isFinite(n) || n < 0 || n > 365) {
          return NextResponse.json({ error: "Repeat between 0 and 365 days." }, { status: 400 });
        }
        const { error } = await supabaseAdmin
          .from("email_campaigns")
          .update({ repeat_days: n === 0 ? null : n, updated_at: new Date().toISOString() })
          .eq("key", body.key);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      case "save-step": {
        if (!body.stepId || !body.patch) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
        const p = body.patch;
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (p.subject !== undefined) {
          if (!p.subject.trim()) return NextResponse.json({ error: "A subject line is required." }, { status: 400 });
          patch.subject = p.subject.trim().slice(0, 300);
        }
        if (p.body !== undefined) {
          if (!p.body.trim()) return NextResponse.json({ error: "The email can't be empty." }, { status: 400 });
          patch.body = p.body.slice(0, 20000);
        }
        if (p.cta_label !== undefined) patch.cta_label = p.cta_label.trim().slice(0, 80) || null;
        if (p.cta_url !== undefined) patch.cta_url = p.cta_url.trim().slice(0, 500) || null;
        if (p.delay_days !== undefined) {
          const n = Math.trunc(Number(p.delay_days));
          if (!Number.isFinite(n) || n < 0 || n > 365) {
            return NextResponse.json({ error: "Wait between 0 and 365 days." }, { status: 400 });
          }
          patch.delay_days = n;
        }
        if (p.active !== undefined) patch.active = Boolean(p.active);

        const { error } = await supabaseAdmin.from("email_campaign_steps").update(patch).eq("id", body.stepId);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      case "add-step": {
        const campaign = body.key ? await getCampaign(body.key) : null;
        if (!campaign) return NextResponse.json({ error: "Which campaign?" }, { status: 400 });
        const { data: last } = await supabaseAdmin
          .from("email_campaign_steps")
          .select("step")
          .eq("campaign_id", campaign.id)
          .order("step", { ascending: false })
          .limit(1)
          .maybeSingle();
        const next = ((last?.step as number) ?? 0) + 1;
        const { error } = await supabaseAdmin.from("email_campaign_steps").insert({
          campaign_id: campaign.id,
          step: next,
          delay_days: 7,
          subject: "Subject line",
          body: "Write the email here.\n\nBlank lines make new paragraphs.",
          active: false,
        });
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true, step: next });
      }

      case "delete-step": {
        if (!body.stepId) return NextResponse.json({ error: "Which step?" }, { status: 400 });
        // Enrolments that already passed this step keep their history in
        // the queue; only the unsent copy goes away.
        const { error } = await supabaseAdmin.from("email_campaign_steps").delete().eq("id", body.stepId);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      // Send the real thing to yourself, rendered against a real shop.
      case "test-step": {
        if (!body.stepId) return NextResponse.json({ error: "Which step?" }, { status: 400 });
        const { data: stepRow } = await supabaseAdmin
          .from("email_campaign_steps")
          .select("id, campaign_id, step, delay_days, subject, body, cta_label, cta_url, active")
          .eq("id", body.stepId)
          .maybeSingle();
        const step = stepRow as Step | null;
        if (!step) return NextResponse.json({ error: "That step is gone." }, { status: 404 });
        const store = await previewStore();
        if (!store) return NextResponse.json({ error: "No unclaimed shop to preview against." }, { status: 400 });
        const to = user.email;
        if (!to) return NextResponse.json({ error: "No address on your account." }, { status: 400 });

        const factMap = await factsFor([store.id]);
        const f = factMap.get(store.id);
        const vars = varsForStore(store, {
          claim_link: `${SITE}/claim/${store.slug}?t=${claimToken(store.id)}`,
          whats_happening: f ? whatsHappening(f, store.name) : "",
          whats_missing: f ? whatsMissing(f) : "",
        });
        // Sent as BULK, exactly like the real thing: same from address on
        // the outreach subdomain, same unsubscribe headers, same shell.
        // A test that goes out over the transactional domain proves the
        // wrong path, and you find that out on the first real send.
        await dispatchOne({
          kind: "campaign_test",
          to,
          bulk: true,
          ignorePause: true,
          preheader: previewLine(step.body, vars),
          subject: `[test] ${renderSubject(step.subject.trim() === "{{subject_hook}}" && f ? subjectHook(f, store.name) : step.subject, vars)}`,
          html:
            `<p style="margin:0 0 20px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#7d8c99;">Test of step ${step.step}, written as if it were going to ${store.name}.</p>` +
            renderBody(step.body, vars, { label: step.cta_label, url: step.cta_url }),
          context: { step: step.step, store_id: store.id },
        });
        return NextResponse.json({ ok: true, to, shop: store.name });
      }

      case "run-now": {
        const campaign = body.key ? await getCampaign(body.key) : null;
        if (!campaign) return NextResponse.json({ error: "Which campaign?" }, { status: 400 });
        const result = await runCampaign(campaign);
        return NextResponse.json({ ok: true, ...result });
      }

      case "dry-run": {
        const campaign = body.key ? await getCampaign(body.key) : null;
        if (!campaign) return NextResponse.json({ error: "Which campaign?" }, { status: 400 });
        const result = await runCampaign(campaign, { dry: true });
        return NextResponse.json({ ok: true, ...result });
      }

      // A shop replied "take me off". One press does everything: never
      // email the address again, mark the shop's contact as opted out so
      // no campaign re-enrols it, stop every enrolment, and cancel anything
      // already waiting in the outbox. The shop's public page is untouched.
      case "remove-outreach": {
        const raw = String(body.target ?? "").trim().toLowerCase().replace(/^mailto:/, "");
        const isEmail = /^[^\s@]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(raw);
        const domain = raw.replace(/^@/, "").replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
        const isDomain = !isEmail && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain);
        if (!isEmail && !isDomain) {
          return NextResponse.json({ error: "Enter an email address, or a domain like reeflifeaquariums.com." }, { status: 400 });
        }
        // A shared mailbox provider is many shops, not one. Removing
        // "gmail.com" would take every Gmail-using shop off the list.
        const SHARED = /^(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|aol|icloud|me|mac|comcast|att|sbcglobal|verizon|protonmail|proton|gmx|mail|zoho)\./;
        if (isDomain && SHARED.test(domain)) {
          return NextResponse.json({ error: `${domain} is shared by lots of shops. Enter their full email address instead.` }, { status: 400 });
        }
        const pattern = isEmail ? raw : `%@${domain}`;
        const now = new Date().toISOString();

        // Every address we hold for it: shop contacts plus anything enrolled.
        const [{ data: contacts }, { data: enrolled }] = await Promise.all([
          supabaseAdmin.from("store_contacts").select("store_id, email").ilike("email", pattern),
          supabaseAdmin.from("email_campaign_enrollments").select("email").ilike("email", pattern),
        ]);
        const emails = new Set<string>();
        if (isEmail) emails.add(raw);
        for (const r of [...(contacts ?? []), ...(enrolled ?? [])] as { email: string | null }[]) {
          if (r.email) emails.add(r.email.trim().toLowerCase());
        }
        if (emails.size === 0) {
          return NextResponse.json({ error: `No shop contact found at ${domain}. Nothing to remove.` }, { status: 404 });
        }
        for (const e of emails) await suppress(e, "unsubscribe", "Asked by reply to be removed from outreach");

        const { data: offContacts, error: cErr } = await supabaseAdmin
          .from("store_contacts")
          .update({ unsubscribed_at: now })
          .ilike("email", pattern)
          .is("unsubscribed_at", null)
          .select("store_id");
        if (cErr) throw new Error(cErr.message);

        const { data: stopped, error: eErr } = await supabaseAdmin
          .from("email_campaign_enrollments")
          .update({ status: "stopped", stop_reason: "unsubscribed", stopped_at: now })
          .ilike("email", pattern)
          .eq("status", "active")
          .select("id");
        if (eErr) throw new Error(eErr.message);

        const { data: cancelled, error: qErr } = await supabaseAdmin
          .from("email_queue")
          .update({ status: "failed", fail_reason: "other", last_error: "Removed from outreach at their request", locked_at: null })
          .in("to_email", [...emails])
          .eq("status", "pending")
          .select("id");
        if (qErr) throw new Error(qErr.message);

        const storeIds = [...new Set(((contacts ?? []) as { store_id: string | null }[]).map((c) => c.store_id).filter(Boolean))] as string[];
        const { data: shops } = storeIds.length
          ? await supabaseAdmin.from("fish_stores").select("name").in("id", storeIds)
          : { data: [] };

        return NextResponse.json({
          ok: true,
          addresses: [...emails],
          shops: ((shops ?? []) as { name: string }[]).map((s) => s.name),
          contacts: offContacts?.length ?? 0,
          stopped: stopped?.length ?? 0,
          cancelled: cancelled?.length ?? 0,
        });
      }

      case "stop-enrollment": {
        if (!body.enrollmentId) return NextResponse.json({ error: "Which one?" }, { status: 400 });
        const { error } = await supabaseAdmin
          .from("email_campaign_enrollments")
          .update({ status: "stopped", stop_reason: "manual", stopped_at: new Date().toISOString() })
          .eq("id", body.enrollmentId);
        if (error) throw new Error(error.message);
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Unknown action." }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
