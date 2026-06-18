"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl border border-ocean-700/60 bg-ocean-900/40 px-4 py-2 text-sm text-ocean-200 hover:bg-ocean-800/60 transition-colors print:hidden"
    >
      <Printer className="w-4 h-4" /> Print / Save as PDF
    </button>
  );
}
