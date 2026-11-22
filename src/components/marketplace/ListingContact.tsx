"use client";

import { useState } from "react";
import { Mail, Phone, MessageSquareText, Eye } from "lucide-react";
import { formatPhone, smsHref, telHref } from "@/lib/phone";

/**
 * A seller's email and phone, for signed-in members only, and only after a
 * tap. The listing page never sends them to signed-out visitors, so bots that
 * read the page can't harvest them.
 */
export default function ListingContact({
  email,
  phone,
  title,
}: {
  email: string | null;
  phone: string | null;
  title: string;
}) {
  const [shown, setShown] = useState(false);
  if (!email && !phone) return null;

  if (!shown) {
    return (
      <button
        type="button"
        onClick={() => setShown(true)}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-ocean-700/60 px-5 py-3 text-sm font-medium text-ocean-200 transition-colors hover:border-ocean-600 hover:text-white"
      >
        <Eye className="h-4 w-4" />
        Show {email && phone ? "email and phone" : email ? "email" : "phone number"}
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-2 text-sm">
      {email && (
        <a
          href={`mailto:${email}?subject=${encodeURIComponent(title)}`}
          className="flex items-center gap-2 break-all text-ocean-300 transition-colors hover:text-white"
        >
          <Mail className="h-4 w-4 shrink-0 text-ocean-600" />
          {email}
        </a>
      )}
      {phone && (
        <div className="rounded-xl border border-ocean-800/60 bg-ocean-950/50 p-3">
          <p className="mb-2.5 flex items-center gap-2 text-ocean-200">
            <Phone className="h-4 w-4 shrink-0 text-ocean-500" />
            <span className="font-medium tracking-wide">{formatPhone(phone)}</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            <a
              href={telHref(phone)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500/15 px-3 py-2.5 font-medium text-emerald-200 ring-1 ring-emerald-400/30 transition-colors hover:bg-emerald-500/25"
            >
              <Phone className="h-4 w-4" /> Call
            </a>
            <a
              href={smsHref(phone, `Hi, is your "${title}" on Underground Aquarium still available?`)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500/15 px-3 py-2.5 font-medium text-sky-200 ring-1 ring-sky-400/30 transition-colors hover:bg-sky-500/25"
            >
              <MessageSquareText className="h-4 w-4" /> Text
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
