"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { isInApp } from "@/lib/app/nativeSignIn";

/**
 * Back arrow in the header, inside the iPhone app only. A browser has its
 * own back button and Safari has swipe-back; the app has neither, so without
 * this you can't get from a care guide back to the ad you came from.
 * Hidden on the main tab pages, where there's nowhere to go back to.
 */

const TAB_ROOTS = new Set(["/", "/start", "/feed", "/marketplace", "/messages", "/stores", "/profile", "/login"]);

export default function AppBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  const [inApp, setInApp] = useState(false);
  // Pages visited in this app session, so "back" only goes somewhere we've been.
  const visits = useRef(0);

  useEffect(() => {
    setInApp(isInApp());
  }, []);

  useEffect(() => {
    visits.current += 1;
  }, [pathname]);

  if (!inApp || TAB_ROOTS.has(pathname)) return null;

  return (
    <button
      type="button"
      aria-label="Back"
      onClick={() => (visits.current > 1 ? router.back() : router.push("/feed"))}
      className="-ml-2 mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ocean-200 active:bg-ocean-800/60"
    >
      <ChevronLeft className="h-7 w-7" />
    </button>
  );
}
