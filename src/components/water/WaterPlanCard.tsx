import { AlertTriangle, Info, ListChecks } from "lucide-react";
import type { WaterPlan } from "@/lib/waterCheck/engine";

const TONE = {
  danger: { box: "border-red-500/40 bg-red-500/10", icon: "text-red-300", Icon: AlertTriangle },
  warning: { box: "border-amber-500/40 bg-amber-500/10", icon: "text-amber-300", Icon: AlertTriangle },
  note: { box: "border-sky-500/30 bg-sky-500/5", icon: "text-sky-300", Icon: Info },
};

/** One explanation and one set of steps for readings that share a cause. */
export default function WaterPlanCard({ plan }: { plan: WaterPlan }) {
  const t = TONE[plan.level];
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${t.box}`}>
      <div className="flex items-center gap-2.5">
        <t.Icon className={`h-5 w-5 shrink-0 ${t.icon}`} />
        <p className="text-base font-medium text-white">{plan.title}</p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ocean-200">{plan.why}</p>
      <p className="mt-4 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-ocean-300">
        <ListChecks className="h-4 w-4" /> What to do
      </p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-ocean-100 marker:text-ocean-400">
        {plan.steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-ocean-300">
        <span className="font-medium text-emerald-300">It&apos;s fixed when: </span>
        {plan.doneWhen}
      </p>
    </div>
  );
}
