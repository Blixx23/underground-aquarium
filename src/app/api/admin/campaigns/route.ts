import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { dispatchOne } from "@/lib/email/queue";
import { getCampaign, runCampaign, type Step } from "@/lib/campaigns/planner";
import { renderBody, renderSubject, varsForStore } from "@/lib/campaigns/render";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = {
  action?: string;
  key?: string;
  stepId?: string;
  step?: number;
  enrollmentId?: string;
  active?: boolean;
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

        const vars = varsForStore(store);
        await dispatchOne({
          kind: "campaign_test",
          to,
          ignorePause: true,
          subject: `[test] ${renderSubject(step.subject, vars)}`,
          html:
            `<p style="font-family:Helvetica,Arial;font-size:12px;color:#7d8c99;">Test of step ${step.step}, written as if it were going to ${store.name}.</p>` +
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
