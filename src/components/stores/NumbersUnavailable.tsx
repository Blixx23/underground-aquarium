/** Shown if a shop's numbers can't load, instead of an empty page. */
export default function NumbersUnavailable() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-ocean-300">
      Your numbers couldn&apos;t load just now. Refresh in a moment; if it keeps happening, let us know through the
      feedback button.
    </div>
  );
}
