// ============================================================
// BUILD STAMP
//
// Answers one question: which deploy am I looking at right now?
//
// Nothing here is ever bumped by hand. Vercel sets these variables
// on every build from the commit it built, so the stamp is correct
// by construction — it can't drift out of date the way a hand-edited
// version number does.
//
// Locally none of them are set, which is the point: a local build
// says "dev" so you can tell at a glance you're not on production.
//
// Every read below is written out literally as `process.env.NAME`
// rather than looked up by a computed key. Next only substitutes the
// literal form at build time, and the literal form is also the only
// one that survives if any of this ever gets pulled into a client
// component by accident.
// ============================================================

const fullSha =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  "";

/** The seven characters GitHub and Vercel both show. "dev" when built locally. */
export const BUILD_SHA = fullSha ? fullSha.slice(0, 7) : "dev";

/** Full 40-character SHA, or "" locally. */
export const BUILD_SHA_FULL = fullSha;

/** Branch the deploy was built from. */
export const BUILD_REF =
  process.env.VERCEL_GIT_COMMIT_REF ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ??
  "local";

/** The commit message — the human-readable name of the deploy. */
export const BUILD_MESSAGE =
  process.env.VERCEL_GIT_COMMIT_MESSAGE ??
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE ??
  "";

/** production | preview | development */
export const BUILD_ENV =
  process.env.VERCEL_ENV ??
  process.env.NEXT_PUBLIC_VERCEL_ENV ??
  "development";

/** Vercel's own id for this deploy, handy when reading logs. */
export const BUILD_ID = process.env.VERCEL_DEPLOYMENT_ID ?? "";

/**
 * What the footer prints. Production shows just the SHA; anything else
 * says so out loud, so a preview URL is never mistaken for the real site.
 */
export const BUILD_LABEL =
  BUILD_ENV === "production" ? BUILD_SHA : `${BUILD_SHA} · ${BUILD_ENV}`;
