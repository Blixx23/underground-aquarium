import { createServerClient, type CookieOptions } from '@supabase/ssr'
   import { NextResponse, type NextRequest } from 'next/server'
   import { ADMIN_COOKIE, adminGateEnabled, validUnlockToken } from '@/lib/admin/unlock'

   // Refreshes the Supabase auth session on every matched request and keeps the
   // session cookies in sync between browser and server. This is what keeps
   // users logged in smoothly as their tokens expire.
   // Pages a member who hasn't finished /welcome can still reach: the page
   // itself, sign-in and sign-out, the terms they're agreeing to, and the API.
   const WELCOME_EXEMPT =
     /^\/(welcome|api|auth|login|logout|terms|privacy|rules|account-suspended|account\/deletion-pending)(\/|$)/

   export async function updateSession(request: NextRequest) {
     let supabaseResponse = NextResponse.next({ request })

     const supabase = createServerClient(
       process.env.NEXT_PUBLIC_SUPABASE_URL!,
       process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
       {
         cookies: {
           getAll() {
             return request.cookies.getAll()
           },
           setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
             cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
             supabaseResponse = NextResponse.next({ request })
             cookiesToSet.forEach(({ name, value, options }) =>
               supabaseResponse.cookies.set(name, value, options)
             )
           },
         },
       }
     )

     // IMPORTANT: don't run code between creating the client above and getUser()
     // below. getUser() revalidates the token with Supabase and refreshes it if
     // needed. (Never use getSession() in server code.)
     const {
       data: { user },
     } = await supabase.auth.getUser()

     // A Google sign-up who left /welcome before picking a username and
     // accepting the terms gets sent back there from any page until they
     // finish. Everyone who has accepted carries terms_accepted_at in their
     // account, so only the rare account without it costs a database check,
     // and the profile flag (not the metadata) decides, so nobody can loop.
     if (user && !user.user_metadata?.terms_accepted_at && !WELCOME_EXEMPT.test(request.nextUrl.pathname)) {
       const { data: profile } = await supabase
         .from('profiles')
         .select('needs_username')
         .eq('id', user.id)
         .maybeSingle()
       if (profile?.needs_username) {
         const url = request.nextUrl.clone()
         url.pathname = '/welcome'
         url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`
         const redirect = NextResponse.redirect(url)
         supabaseResponse.cookies.getAll().forEach((c) => redirect.cookies.set(c))
         return redirect
       }
     }

     // The admin area needs the admin password too (see lib/admin/unlock).
     // Pages go to the password screen; API calls get a plain 401.
     const path = request.nextUrl.pathname
     if (user && adminGateEnabled() && /^\/(admin|api\/admin)(\/|$)/.test(path)) {
       const ok = await validUnlockToken(request.cookies.get(ADMIN_COOKIE)?.value, user.id)
       if (!ok) {
         const locked = path.startsWith('/api/')
           ? NextResponse.json({ error: 'The admin area is locked. Enter the admin password.' }, { status: 401 })
           : NextResponse.redirect(new URL(`/admin-unlock?next=${encodeURIComponent(path + request.nextUrl.search)}`, request.url))
         supabaseResponse.cookies.getAll().forEach((c) => locked.cookies.set(c))
         return locked
       }
     }

     // Public marketplace: we only refresh the session here — we do NOT force a
     // login redirect. Pages that need protection (like /profile) check for a
     // user themselves and redirect. Add edge-level guards here later if you want.

     // IMPORTANT: return supabaseResponse as-is so the refreshed cookies survive.
     return supabaseResponse
   }