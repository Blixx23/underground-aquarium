"use client";

import { useState } from "react";
import {
  Settings,
  CreditCard,
  Trophy,
  Inbox,
  Trash2,
  ChevronDown,
} from "lucide-react";

type Tone = "amber" | "emerald" | "ocean" | "coral";

export type AdminSection = {
  key: "settings" | "dues" | "awards" | "requests" | "danger";
  title: string;
  subtitle?: string;
  badge?: { text: string; tone: Tone };
  accent?: Tone;
  slot: React.ReactNode;
};

const ICONS = {
  settings: Settings,
  dues: CreditCard,
  awards: Trophy,
  requests: Inbox,
  danger: Trash2,
} as const;

const BADGE_TONE: Record<Tone, string> = {
  amber: "bg-amber-500/15 text-amber-300",
  emerald: "bg-emerald-500/15 text-emerald-300",
  ocean: "bg-ocean-700/60 text-ocean-200",
  coral: "bg-coral-500/15 text-coral-300",
};

const ICON_TONE: Record<Tone, string> = {
  amber: "text-amber-300",
  emerald: "text-emerald-300",
  ocean: "text-ocean-300",
  coral: "text-coral-300",
};

export default function AdminSections({
  sections,
}: {
  sections: AdminSection[];
}) {
  const [active, setActive] = useState<string | null>(null);

  if (sections.length === 0) return null;

  return (
    <div className="space-y-3">
      {sections.map((s) => {
        const Icon = ICONS[s.key];
        const isActive = active === s.key;
        const accent = s.accent ?? "ocean";
        return (
          <div
            key={s.key}
            className={`rounded-2xl border bg-ocean-900/40 overflow-hidden transition-colors ${
              isActive ? "border-ocean-500" : "border-ocean-800/60"
            }`}
          >
            <button
              type="button"
              onClick={() => setActive(isActive ? null : s.key)}
              aria-expanded={isActive}
              className="w-full text-left p-4 flex items-center justify-between gap-3 hover:bg-ocean-800/20 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`w-5 h-5 shrink-0 ${ICON_TONE[accent]}`} />
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">{s.title}</p>
                  {s.subtitle && (
                    <p className="text-xs text-ocean-500 truncate">
                      {s.subtitle}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {s.badge && (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      BADGE_TONE[s.badge.tone]
                    }`}
                  >
                    {s.badge.text}
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-ocean-500 transition-transform ${
                    isActive ? "rotate-180" : ""
                  }`}
                />
              </div>
            </button>

            {/* Panel opens directly under its own tile. Kept mounted (hidden
                when collapsed) so in-progress edits aren't lost. */}
            <div className={isActive ? "border-t border-ocean-800/60 p-5" : "hidden"}>
              {s.slot}
            </div>
          </div>
        );
      })}
    </div>
  );
}
