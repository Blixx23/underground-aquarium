import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCertificatePdf } from "@/lib/society/certificatePdf";
import { SOCIETY_SLUG } from "@/lib/config";

// pdf-lib needs Node, not the edge runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CertRow = {
  kind: "membership" | "title" | "species" | "course";
  title: string | null;
  detail: string | null;
  recipient_name: string;
  member_number: number | null;
  points: number | null;
  code: string;
  issued_at: string;
};

/**
 * GET /api/society/certificate?kind=membership
 * GET /api/society/certificate?kind=title&title=Breeder
 * GET /api/society/certificate?kind=species&log=<spawn log id>
 * GET /api/society/certificate?kind=course&course=<course id>
 *
 * Issuing happens in the database, which decides whether the member has
 * earned it. This route only draws what the database hands back — it
 * can't be talked into printing a title nobody earned.
 */
export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind");

  const logId = request.nextUrl.searchParams.get("log");
  const courseId = request.nextUrl.searchParams.get("course");

  if (kind !== "membership" && kind !== "title" && kind !== "species" && kind !== "course") {
    return NextResponse.json({ error: "Unknown certificate type." }, { status: 400 });
  }
  // Rank (title) certificates were retired. Any already issued still verify.
  if (kind === "title") {
    return NextResponse.json(
      { error: "Title certificates are no longer issued. Breeder certificates are issued per species." },
      { status: 410 }
    );
  }
  if (kind === "species" && !logId) {
    return NextResponse.json({ error: "Which spawn log?" }, { status: 400 });
  }
  if (kind === "course" && !courseId) {
    return NextResponse.json({ error: "Which course?" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data, error } =
    kind === "species"
      ? await supabase.rpc("issue_species_certificate", { p_log: logId })
      : kind === "course"
        ? await supabase.rpc("issue_course_certificate", { p_course: courseId })
        : await supabase.rpc("issue_society_certificate", {
            p_kind: kind,
            p_title: null,
          });
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Couldn't issue that certificate." },
      { status: 403 }
    );
  }
  const cert = (Array.isArray(data) ? data[0] : data) as CertRow;

  // Year admitted, for the membership certificate.
  const { data: society } = await supabase
    .from("clubs")
    .select("id")
    .eq("slug", SOCIETY_SLUG)
    .maybeSingle();
  let memberSince: number | null = null;
  if (society) {
    const { data: me } = await supabase
      .from("club_members")
      .select("joined_at")
      .eq("club_id", society.id)
      .eq("user_id", user.id)
      .maybeSingle();
    memberSince = me?.joined_at ? new Date(me.joined_at).getFullYear() : null;
  }

  // The founder's signature lives at /public/society/signature.png. Until it
  // exists the certificate uses a typeset signature line instead.
  const origin = request.nextUrl.origin;
  let signaturePng: Uint8Array | null = null;
  try {
    const res = await fetch(`${origin}/society/signature.png`, { cache: "force-cache" });
    if (res.ok && res.headers.get("content-type")?.includes("png")) {
      signaturePng = new Uint8Array(await res.arrayBuffer());
    }
  } catch {
    signaturePng = null;
  }

  const pdf = await buildCertificatePdf({
    kind: cert.kind,
    recipientName: cert.recipient_name,
    memberNumber: cert.member_number,
    title: cert.title,
    detail: cert.detail,
    points: cert.points,
    issuedAt: new Date(cert.issued_at),
    memberSince,
    code: cert.code,
    verifyUrl: `${origin}/verify/${cert.code}`,
    signaturePng,
  });

  const slug = (
    cert.kind === "membership"
      ? "Membership"
      : cert.kind === "species"
        ? `Certified-${cert.title ?? "Species"}-Breeder`
        : cert.title ?? "Certificate"
  )
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // ?inline=1 shows it in the browser (the course certificate page embeds it).
      "Content-Disposition": `${request.nextUrl.searchParams.get("inline") === "1" ? "inline" : "attachment"}; filename="${cert.code}-${slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
