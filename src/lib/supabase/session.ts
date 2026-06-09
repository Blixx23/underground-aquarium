import { createServerClient, type CookieOptions } from '@supabase/ssr'
   import { NextResponse, type NextRequest } from 'next/server'

   // Refreshes the Supabase auth session on every matched request and keeps the
   // session cookies in sync between browser and server. This is what keeps
   // users logged in smoothly as their tokens expire.
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
     await supabase.auth.getUser()

     // Public marketplace: we only refresh the session here — we do NOT force a
     // login redirect. Pages that need protection (like /profile) check for a
     // user themselves and redirect. Add edge-level guards here later if you want.

     // IMPORTANT: return supabaseResponse as-is so the refreshed cookies survive.
     return supabaseResponse
   }