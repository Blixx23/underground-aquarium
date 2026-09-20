"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

/** A link that tells the shop's owner it was tapped (directions, phone, website). */
export default function TrackedLink({
  href,
  storeId,
  kind,
  className,
  target,
  rel,
  children,
}: {
  href: string;
  storeId: string;
  kind: "directions" | "phone" | "website";
  className?: string;
  target?: string;
  rel?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={className}
      onClick={() => {
        createClient().rpc("record_store_event", { p_store: storeId, p_kind: kind });
      }}
    >
      {children}
    </Link>
  );
}
