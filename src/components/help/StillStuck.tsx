import { Mail } from "lucide-react";

export default function StillStuck() {
  return (
    <section className="mt-12 flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.05] p-5 sm:flex-row sm:items-center">
      <div>
        <h2 className="font-medium text-white">Still stuck?</h2>
        <p className="mt-1 text-sm text-ocean-300">
          Email us with the page you were on and what happened. A real person reads every message.
        </p>
      </div>
      <a
        href="mailto:support@undergroundaquarium.com"
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
      >
        <Mail className="h-4 w-4" /> Email support
      </a>
    </section>
  );
}
