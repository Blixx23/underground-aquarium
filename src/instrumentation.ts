import type { Instrumentation } from "next";

/**
 * Next calls this whenever a page, API route or server action throws on the
 * server. We email the support inbox (at most once an hour per error and page).
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  // Email and the database client only run on the Node server, not at the edge.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // A "not found" or a redirect is Next working as designed, not a crash.
  const e = err as { message?: string; digest?: string; stack?: string };
  const digest = e.digest ?? "";
  if (digest.startsWith("NEXT_NOT_FOUND") || digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR")) return;
  const { alertSiteError } = await import("@/lib/ops/errorAlert");
  await alertSiteError({
    where: request.path,
    message: e.message ?? String(err),
    digest: e.digest ?? null,
    detail: e.stack ?? null,
    source: "server",
  });
};
