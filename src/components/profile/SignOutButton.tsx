"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await createClient().auth.signOut();
        router.push("/");
        router.refresh();
      }}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm text-ocean-300 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
