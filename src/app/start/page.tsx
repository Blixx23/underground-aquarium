import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StartScreen from "./StartScreen";

export const metadata: Metadata = {
  title: "Welcome",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Where the iPhone app opens (capacitor.config server.url). Signed in: straight
 * to the feed, decided on the server so there's no flash. Signed out: the
 * welcome screen, unless they already chose "Look around first".
 */
export default async function StartPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/feed");
  return <StartScreen />;
}
