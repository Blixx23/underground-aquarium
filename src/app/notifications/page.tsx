import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NOTIFICATION_COLUMNS, type Notification } from "@/lib/notifications";
import NotificationsList from "./NotificationsList";
import NotificationSettings from "./NotificationSettings";
import { DEFAULT_EMAIL_OFF, type DigestChoice } from "@/lib/notificationGroups";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data }, { data: prefs }] = await Promise.all([
    supabase
      .from("notifications")
      .select(NOTIFICATION_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(30),
    // "*" so the page still loads if a newer settings column isn't there yet.
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);
  const p = prefs as { muted_notifications?: string[] | null; email_off?: string[] | null; email_digest?: string | null } | null;
  const muted = (p?.muted_notifications ?? []) as string[];
  const emailOff = p?.email_off ?? DEFAULT_EMAIL_OFF;
  const digest = (["bundled", "daily", "off"].includes(String(p?.email_digest)) ? p!.email_digest : "bundled") as DigestChoice;

  return (
    <main className="min-h-screen pt-28 pb-20 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-6">Notifications</h1>
        <NotificationsList userId={user.id} initial={(data ?? []) as Notification[]} initialMuted={muted} />
        <div id="settings" className="mt-10 scroll-mt-28">
          {/* Keyed on the list so a "Turn off" from a notification shows up here too. */}
          <NotificationSettings
            key={muted.join(",")}
            userId={user.id}
            initialMuted={muted}
            initialEmailOff={emailOff}
            initialDigest={digest}
          />
        </div>
      </div>
    </main>
  );
}
