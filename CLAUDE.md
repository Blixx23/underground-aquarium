# Underground Aquarium: rules for Claude working in this repo

This is undergroundaquarium.com, a live aquarium hobby community with real members. Chris Lewis owns it.

## Stack
- Next.js 16 App Router (`src/`), React 18, TypeScript, Tailwind v3.
- Supabase (Postgres, auth, storage). Server code uses `supabaseAdmin` from `@/lib/supabase/admin`; pages use
  `createClient` from `@/lib/supabase/server`.
- Deployed on Vercel from `main`. Every branch gets a preview deployment.
- Email goes through the queue in `src/lib/email/queue.ts` (Resend). Never call Resend directly.

## Style
- Tailwind ocean theme: `ocean-*` backgrounds and text, `emerald` for actions, `amber` for Society/gold accents,
  `coral-300/400/500` for warnings (there is no `coral-600`). Cards are `rounded-2xl border border-ocean-800/60`.
- Plain, friendly wording on the site. No em dashes in user-facing text.
- Comments explain why, briefly.

## Connecting new features (do this every time)
- New admin page: add it to `ADMIN_SECTIONS` in `src/lib/admin/sections.ts` (or to another section's `also` if it's a
  tab). The build fails if you don't (`scripts/check-admin-sections.mjs`).
- Anything that waits on Chris (a new status like 'pending' or 'open'): add a `queues` entry for it there. That alone
  puts it in the menu badge, the Dashboard and the AI team's morning session.
- New database table: describe it in `src/lib/ops/tableMap.ts` so the AI team can read it. The weekly review flags
  tables the map is missing.
- A new kind of worry the AI team should watch for (retired wording, a new number to track): update the worker's job or
  checklist in `src/lib/ops/workers.ts`.

## Rules for fixes
- Keep changes small and focused on the issue. Don't refactor unrelated code.
- Never add `Co-Authored-By`, Claude, or Anthropic attribution lines to commits or pull requests.
- Never put promotional or third-party links in the site; only undergroundaquarium.com URLs.
- Don't touch payments, Stripe, dues, sign-in, or database structure (SQL). If a fix needs any of these, stop and
  explain in a comment instead.
- Don't change data belonging to real members.
- Run `npx tsc --noEmit` before finishing; the change must type-check.
- Pull request descriptions: what was wrong, what changed, how to check it on the preview. Plain words.
