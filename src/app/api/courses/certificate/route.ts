import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { unprintableNameChars } from "@/lib/society/certificatePdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/courses/certificate { courseId, name }
 *
 * Creates a course certificate with the name the member confirmed. The name is
 * checked against the certificate's fonts first, so it can never print with
 * letters missing. Once created, the certificate (and its name) is locked:
 * calling this again just returns the same certificate.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { courseId?: string; name?: string };
  const courseId = typeof body.courseId === "string" ? body.courseId : "";
  const name = (typeof body.name === "string" ? body.name : "").replace(/\s+/g, " ").trim();
  if (!courseId) return NextResponse.json({ error: "Which course?" }, { status: 400 });

  if (name.length < 2 || name.length > 60) {
    return NextResponse.json({ error: "Enter your name, 2 to 60 characters." }, { status: 400 });
  }
  if (/[<>{}[\]\\|@#$%^*_=+~`"]/.test(name) || /\d/.test(name)) {
    return NextResponse.json(
      { error: "Use letters only (hyphens, apostrophes and periods are fine), the way you want it printed." },
      { status: 400 }
    );
  }
  const bad = await unprintableNameChars(name);
  if (bad.length) {
    return NextResponse.json(
      { error: `The certificate can't print ${bad.map((c) => `"${c}"`).join(", ")}. Please use plain letters for those.` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.rpc("issue_course_certificate", { p_course: courseId, p_name: name });
  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Couldn't create your certificate. Try again." }, { status: 400 });
  }
  const cert = (Array.isArray(data) ? data[0] : data) as { code: string; recipient_name: string };
  return NextResponse.json({ code: cert.code, name: cert.recipient_name });
}
