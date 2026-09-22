"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Take one shop out of the sequence by hand. */
export default function StopEnrollment({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/admin/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop-enrollment", enrollmentId: id }),
        });
        setBusy(false);
        router.refresh();
      }}
      className="rounded-lg border border-ocean-800 px-2.5 py-1 text-xs text-ocean-400 hover:text-white disabled:opacity-40"
    >
      Stop
    </button>
  );
}
