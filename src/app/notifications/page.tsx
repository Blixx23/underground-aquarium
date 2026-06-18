import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationsList from "./NotificationsList";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-3xl text-white mb-6">Notifications</h1>
        <NotificationsList initial={data ?? []} />
      </div>
    </main>
  );
}
