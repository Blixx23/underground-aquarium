import { redirect } from "next/navigation";

// The Community Hub and the Feed were two different feeds. There is one now.
export default function CommunityPage() {
  redirect("/feed?tab=everyone");
}
