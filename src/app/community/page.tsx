import { permanentRedirect } from "next/navigation";

// The old WordPress community hub. Its conversations live in the forums now.
export default function CommunityPage() {
  permanentRedirect("/forums");
}
