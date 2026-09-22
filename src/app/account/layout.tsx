import type { ReactNode } from "react";
import SettingsNav from "@/components/settings/SettingsNav";

/**
 * Shared frame for the account pages, so settings sit beside the same kind
 * of side nav as the tools, shop and admin areas.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10 lg:pt-28">
      <SettingsNav />
      <div className="min-w-0 [&_main]:min-h-0 [&_main]:p-0 [&_main>div]:mx-0 [&_main>div]:max-w-none">
        {children}
      </div>
    </div>
  );
}
