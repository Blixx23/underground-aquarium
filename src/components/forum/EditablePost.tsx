"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useForumViewer } from "@/lib/forum/useForumViewer";
import {
  MAX_OPENER,
  MAX_REPLY,
  MAX_TITLE,
  MIN_TITLE,
  tooLongMessage,
} from "@/lib/forum/limits";
import CharCounter from "@/components/forum/CharCounter";

/**
 * Wraps one forum post (the opener or a reply) and adds Edit and Delete for
 * its author and for admins. The thread page is cached for everyone, so it
 * renders the post the same for all readers and this component decides, in
 * the reader's browser, whether to show the buttons. The server checks again
 * before changing anything.
 */
export default function EditablePost({
  postId,
  authorId,
  isOp,
  body,
  title,
  hasImages = false,
  locked = false,
  categorySlug,
  children,
}: {
  postId: string;
  authorId: string | null;
  isOp: boolean;
  /** The post's current Markdown, to start the editor from. */
  body: string;
  /** Thread title, only for the opening post. */
  title?: string;
  /** The opener has photos, so its text may be left empty. */
  hasImages?: boolean;
  locked?: boolean;
  /** Where to send the reader after deleting a whole thread. */
  categorySlug: string;
  /** The post as rendered by the server (Markdown, photos and so on). */
  children: ReactNode;
}) {
  const router = useRouter();
  const viewer = useForumViewer();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body);
  const [draftTitle, setDraftTitle] = useState(title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const isAuthor = Boolean(viewer && authorId && viewer.id === authorId);
  const isAdmin = Boolean(viewer?.isAdmin);
  const canDelete = isAuthor || isAdmin;
  // A locked thread is frozen as it stands, so only admins can still edit.
  const canEdit = canDelete && (!locked || isAdmin);
  const max = isOp ? MAX_OPENER : MAX_REPLY;

  function startEditing() {
    setDraft(body);
    setDraftTitle(title ?? "");
    setError(null);
    setEditing(true);
  }

  async function save() {
    const text = draft.trim();
    const newTitle = draftTitle.trim();
    if (isOp && newTitle.length < MIN_TITLE) {
      setError(`Give your post a title (at least ${MIN_TITLE} characters).`);
      return;
    }
    if (isOp && newTitle.length > MAX_TITLE) {
      setError(tooLongMessage("The title", newTitle.length, MAX_TITLE));
      return;
    }
    if (text.length > max) {
      setError(tooLongMessage(isOp ? "Your post" : "Your reply", text.length, max));
      return;
    }
    if (!text && !(isOp && hasImages)) {
      setError("Write something first.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/forum/post", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          post_id: postId,
          body: text,
          ...(isOp ? { title: newTitle } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't save your changes.");
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save your changes.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const question = isOp
      ? "Delete this whole thread? The opening post and every reply will stop showing. This can't be undone."
      : "Delete this reply? This can't be undone.";
    if (!window.confirm(question)) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/forum/post", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't delete that.");
      if (isOp) {
        // The thread is gone, so leave its page for the section it was in.
        router.push(`/forums/${categorySlug}`);
        router.refresh();
        return;
      }
      setDeleted(true);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete that.");
      setBusy(false);
    }
  }

  if (deleted) {
    return <p className="text-xs italic text-ocean-500">Reply deleted.</p>;
  }

  const inputClass =
    "w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";

  return (
    <div>
      {editing ? (
        <div className="mt-1">
          {isOp && (
            <>
              <div className="mb-1 flex items-baseline justify-between">
                <label className="block text-xs text-ocean-400">Title</label>
                <CharCounter length={draftTitle.trim().length} max={MAX_TITLE} />
              </div>
              <input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className={`${inputClass} mb-3`}
              />
            </>
          )}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={isOp ? 10 : 4}
            className={`${inputClass} resize-y`}
          />
          {error && <p className="mt-1 text-xs text-coral-300">{error}</p>}
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-ocean-600 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              disabled={busy}
              className="text-xs text-ocean-500 hover:text-ocean-300"
            >
              Cancel
            </button>
            <span className="text-[11px] text-ocean-600">Markdown supported</span>
            <CharCounter length={draft.trim().length} max={max} className="ml-auto" />
          </div>
          {isOp && hasImages && (
            <p className="mt-2 text-[11px] text-ocean-600">
              Photos stay as they are. To change them, delete the thread and post it again.
            </p>
          )}
        </div>
      ) : (
        children
      )}

      {!editing && canDelete && (
        <div className="mt-1 flex items-center gap-3">
          {canEdit && (
            <button
              type="button"
              onClick={startEditing}
              disabled={busy}
              className="text-xs text-ocean-400 transition-colors hover:text-ocean-200"
            >
              Edit
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="text-xs text-ocean-400 transition-colors hover:text-coral-300"
          >
            {busy ? "Deleting…" : isOp ? "Delete thread" : "Delete"}
          </button>
          {error && <span className="text-xs text-coral-300">{error}</span>}
        </div>
      )}
    </div>
  );
}
