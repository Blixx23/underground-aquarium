import { notFound, permanentRedirect } from "next/navigation";
import { matchLegacyPost } from "@/lib/legacy";

// Old WordPress posts lived at the top level (/how-to-cycle-your-aquarium/).
// Every real page on the site has its own folder, which always wins over
// this one, so only unknown top-level addresses ever land here.
export const revalidate = 86400;

type Params = { params: Promise<{ legacy: string }> };

export async function generateMetadata({ params }: Params) {
  const { legacy } = await params;
  // Decided before anything streams, so Google gets a real 308 or 404.
  const to = await matchLegacyPost(legacy);
  if (to) permanentRedirect(to);
  notFound();
}

export default async function LegacyPost({ params }: Params) {
  const { legacy } = await params;
  const to = await matchLegacyPost(legacy);
  if (to) permanentRedirect(to);
  notFound();
}
