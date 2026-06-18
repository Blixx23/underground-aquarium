"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

export default function DuesSuccessBanner() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Remove the ?dues=success param so refreshing won't re-show this.
    try {
      window.history.replaceState({}, "", window.location.pathname);
    } catch {
      // ignore if history isn't available
    }
    const t = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 mb-6 flex items-center gap-2 text-emerald-200">
      <CheckCircle2 className="w-5 h-5 shrink-0" />
      <span className="flex-1">
        Dues paid — thank you! Your membership is active.
      </span>
      <button
        onClick={() => setVisible(false)}
        className="text-emerald-300/70 hover:text-emerald-200 shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
