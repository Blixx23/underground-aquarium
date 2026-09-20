import { redirect } from "next/navigation";

// There's no blog yet. Rather than a "Coming soon" page, send people to
// where the writing actually happens today.
export default function BlogPage() {
  redirect("/forums");
}
