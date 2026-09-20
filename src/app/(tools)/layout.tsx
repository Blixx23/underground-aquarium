import type { ReactNode } from "react";
import ToolsNav from "@/components/tools/ToolsNav";

/**
 * Shared frame for Tank Builder, Water Check, Fish Species and Glossary.
 * The pages keep their own content; this adds the tools nav and takes
 * over the outer spacing so every tool lines up the same way.
 */
export default function ToolsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10 lg:pt-28">
      <ToolsNav />
      <div className="min-w-0 [&_main]:min-h-0 [&_main]:p-0 [&_main>div]:mx-0">{children}</div>
    </div>
  );
}
