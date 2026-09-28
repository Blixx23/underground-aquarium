"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Who is reading the thread: their user id and whether they're an admin. */
export type ForumViewer = { id: string; isAdmin: boolean } | null;

// Thread pages are cached for everyone, so the server can't know who is
// looking. Each post's Edit / Delete buttons ask here instead. One shared
// lookup per page means a thread with 50 replies makes one request, not 50.
let pending: Promise<ForumViewer> | null = null;
const listeners = new Set<(v: ForumViewer) => void>();
let watchingAuth = false;

function loadViewer(): Promise<ForumViewer> {
  if (!pending) {
    const supabase = createClient();
    pending = (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();
      return { id: user.id, isAdmin: Boolean(profile?.is_admin) };
    })().catch(() => {
      // Let the next component try again rather than remembering a failure.
      pending = null;
      return null;
    });
  }
  return pending;
}

// If someone signs in or out without a full page reload, forget the old answer
// so buttons appear (or disappear) for the right person.
function watchAuth() {
  if (watchingAuth) return;
  watchingAuth = true;
  createClient().auth.onAuthStateChange((event) => {
    if (event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
    pending = null;
    loadViewer().then((v) => listeners.forEach((fn) => fn(v)));
  });
}

/** The signed-in viewer, or null while loading and when signed out. */
export function useForumViewer(): ForumViewer {
  const [viewer, setViewer] = useState<ForumViewer>(null);
  useEffect(() => {
    let active = true;
    const update = (v: ForumViewer) => {
      if (active) setViewer(v);
    };
    listeners.add(update);
    watchAuth();
    loadViewer().then(update);
    return () => {
      active = false;
      listeners.delete(update);
    };
  }, []);
  return viewer;
}
