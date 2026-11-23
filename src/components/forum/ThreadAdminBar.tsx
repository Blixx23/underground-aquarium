"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForumViewer } from "@/lib/forum/useForumViewer";
import { moderate as moderateRequest } from "@/lib/admin/moderateClient";

/**
 * Admin-only Archive thread / Suspend author, shown on a thread whose opening
 * post can't be shown (it was hidden or removed), so there's no post to hang
 * the usual buttons on. Without this a thread like that sat in the forums with
 * nothing to click. Same API as the buttons under posts (/api/admin/moderate).
 */
export default function ThreadAdminBar({ threadId, categorySlug }: { threadId: string; categorySlug: string }) {
  const router = useRouter();
  const viewer = useForumViewer();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!viewer?.isAdmin) return null;

  async function run(action: "archive_thread" | "suspend") {
    const question =
      action === "archive_thread"
        ? "Archive this whole thread? It disappears from the forums for everyone. Nothing is deleted."
        : "Suspend the member who started this thread? They're signed out, can't sign back in, their ads come down and their tanks go private. You can undo it from Suspended accounts on Admin > Reports.";
    if (!window.confirm(question)) return;
    setBusy(true);
    setNote(null);
    try {
      const data = await moderateRequest({ action, thread_id: threadId });
      if (data.error) throw new Error(data.error);
      if (action === "archive_thread") {
        router.push(data.redirect ?? `/forums/${categorySlug}`);
        router.refresh();
        return;
      }
      setNote("Member suspended.");
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Couldn't do that.");
    }
    setBusy(false);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
      <span className="text-amber-200/80">Admin: this thread's opening post is hidden.</span>
      <button type="button" disabled={busy} onClick={() => run("archive_thread")} className="text-amber-300 hover:text-amber-200">
        Archive thread
      </button>
      <button type="button" disabled={busy} onClick={() => run("suspend")} className="text-coral-300 hover:text-coral-200">
        Suspend author
      </button>
      {note && <span className="text-ocean-300">{note}</span>}
    </div>
  );
}
