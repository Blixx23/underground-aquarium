"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CircleCheck, CircleAlert, Loader2 } from "lucide-react";
import { formatAsTyped, parseCode } from "@/lib/certificates/code";

/**
 * The registry's lookup box.
 *
 * Formats the code as it's typed so it looks like the paper, and checks
 * the check character on the spot, so a typo gets caught here instead of
 * coming back as "not found" and making someone think their certificate
 * is fake.
 */
export default function VerifyForm({
  initial = "",
  size = "lg",
}: {
  initial?: string;
  size?: "lg" | "md";
}) {
  const router = useRouter();
  const [value, setValue] = useState(formatAsTyped(initial));
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);

  const parsed = parseCode(value);
  const ready = parsed.state === "valid" || parsed.state === "legacy";

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!ready) return;
    setBusy(true);
    router.push(`/verify/${parsed.code}`);
  }

  let hint: { tone: "ok" | "bad" | "idle"; text: string } = {
    tone: "idle",
    text: "Printed at the top right and bottom of every certificate.",
  };
  if (parsed.state === "valid") {
    hint = {
      tone: "ok",
      text: parsed.program
        ? `Well-formed ${parsed.program.name} code. Look it up.`
        : "Well-formed code. Look it up.",
    };
  } else if (parsed.state === "legacy") {
    hint = { tone: "ok", text: "An early Society code. These are still honoured." };
  } else if (parsed.state === "typo") {
    hint = {
      tone: "bad",
      text: "One character doesn't match. Check each one against the certificate.",
    };
  } else if (parsed.state === "invalid" && value) {
    hint = { tone: "bad", text: "That isn't an Underground Aquarium code." };
  } else if (parsed.state === "incomplete" && touched && value) {
    hint = { tone: "bad", text: `${12 - parsed.typed} more characters to go.` };
  }

  const big = size === "lg";

  return (
    <form onSubmit={submit} className="w-full">
      <div
        className={`flex flex-col gap-3 rounded-2xl border bg-ocean-950/80 p-2 shadow-2xl shadow-black/40 sm:flex-row sm:items-center ${
          hint.tone === "bad"
            ? "border-coral-500/50"
            : hint.tone === "ok"
            ? "border-amber-400/60"
            : "border-amber-500/25"
        }`}
      >
        <label htmlFor="cert-code" className="sr-only">
          Certificate code
        </label>
        <input
          id="cert-code"
          value={value}
          onChange={(e) => setValue(formatAsTyped(e.target.value))}
          onBlur={() => setTouched(true)}
          placeholder="UA-XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          inputMode="text"
          className={`min-w-0 flex-1 bg-transparent px-4 font-mono uppercase tracking-[0.18em] text-white placeholder-ocean-700 focus:outline-none ${
            big ? "py-3 text-xl sm:text-2xl" : "py-2 text-lg"
          }`}
        />
        <button
          type="submit"
          disabled={busy}
          className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-semibold transition-all ${
            ready
              ? "bg-amber-400 text-ocean-950 hover:bg-amber-300 hover:shadow-lg hover:shadow-amber-500/20"
              : "bg-ocean-800/80 text-ocean-400"
          } ${big ? "h-14 px-7" : "h-12 px-5"}`}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Verify
          {!busy && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>

      <p
        className={`mt-3 flex items-center justify-center gap-2 text-sm ${
          hint.tone === "ok"
            ? "text-amber-300"
            : hint.tone === "bad"
            ? "text-coral-300"
            : "text-ocean-500"
        }`}
        aria-live="polite"
      >
        {hint.tone === "ok" && <CircleCheck className="h-4 w-4 shrink-0" />}
        {hint.tone === "bad" && <CircleAlert className="h-4 w-4 shrink-0" />}
        {hint.text}
      </p>
    </form>
  );
}
