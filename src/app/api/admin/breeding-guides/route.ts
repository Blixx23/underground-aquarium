import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { draftGuide } from "@/lib/breeding/draftGuide";

export const dynamic = "force-dynamic";
// A draft or redraft is two careful AI passes.
export const maxDuration = 300;

/**
 * Admin only. AI-drafted breeding guides: publish (Yes, with Chris's edits),
 * discard (No), redraft with a note (Something else), or draft one for a
 * species that has none.
 */

const s = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function isAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  return Boolean(me?.is_admin);
}

function refresh(slug: string, speciesSlug: string | null) {
  revalidatePath("/breeding");
  revalidatePath(`/breeding/${slug}`);
  if (speciesSlug) revalidatePath(`/species/${speciesSlug}`);
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const id = s(body.id, 64);

  switch (s(body.action, 20)) {
    case "publish": {
      const g = (body.guide ?? {}) as Record<string, unknown>;
      const patch: Record<string, unknown> = { is_published: true, updated_at: new Date().toISOString() };
      // Chris's edits, if any, replace the draft's text.
      if (typeof g.summary === "string" && g.summary.trim()) patch.summary = s(g.summary, 220);
      if (typeof g.intro === "string" && g.intro.trim()) patch.intro = s(g.intro, 1500);
      if (g.facts && typeof g.facts === "object") {
        const facts: Record<string, string> = {};
        for (const [k, v] of Object.entries(g.facts as Record<string, unknown>)) if (s(v, 300)) facts[k] = s(v, 300);
        patch.facts = facts;
      }
      if (Array.isArray(g.sections)) {
        patch.sections = (g.sections as Record<string, unknown>[])
          .map((x) => ({ heading: s(x.heading, 80), text: s(x.text, 4000) }))
          .filter((x) => x.heading && x.text);
      }
      if (Array.isArray(g.faq)) {
        patch.faq = (g.faq as Record<string, unknown>[]).map((x) => ({ q: s(x.q, 200), a: s(x.a, 600) })).filter((x) => x.q && x.a);
      }
      const { data, error } = await supabaseAdmin
        .from("breeding_guides")
        .update(patch)
        .eq("id", id)
        .eq("is_published", false)
        .select("slug, species_slug")
        .maybeSingle();
      if (error || !data) return NextResponse.json({ error: error?.message ?? "That draft is gone." }, { status: 400 });
      refresh(data.slug as string, (data.species_slug as string | null) ?? null);
      return NextResponse.json({ ok: true, message: "Published. It's live on the breeding guides and the species page.", slug: data.slug });
    }

    case "discard": {
      const { error } = await supabaseAdmin.from("breeding_guides").delete().eq("id", id).eq("is_published", false);
      return error
        ? NextResponse.json({ error: error.message }, { status: 400 })
        : NextResponse.json({ ok: true, message: "Draft thrown out." });
    }

    case "redraft": {
      const note = s(body.note, 1000);
      if (!note) return NextResponse.json({ error: "What should change?" }, { status: 400 });
      const { data: g } = await supabaseAdmin.from("breeding_guides").select("species_slug, is_published").eq("id", id).maybeSingle();
      if (!g?.species_slug || g.is_published) return NextResponse.json({ error: "That draft is gone." }, { status: 404 });
      const r = await draftGuide(g.species_slug as string, { note });
      return r.ok
        ? NextResponse.json({ ok: true, message: `Redrafted and fact-checked again (${r.cents.toFixed(0)}¢).` })
        : NextResponse.json({ error: r.error }, { status: 500 });
    }

    case "draft": {
      const slug = s(body.speciesSlug, 120);
      if (!slug) return NextResponse.json({ error: "Which species?" }, { status: 400 });
      const r = await draftGuide(slug);
      return r.ok
        ? NextResponse.json({ ok: true, message: `Drafted and fact-checked (${r.cents.toFixed(0)}¢). Review it below.` })
        : NextResponse.json({ error: r.error }, { status: 400 });
    }

    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
}
