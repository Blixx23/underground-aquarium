import { type NextRequest } from 'next/server'
   import { updateSession } from '@/lib/supabase/session'

   export async function proxy(request: NextRequest) {
     return await updateSession(request)
   }

   export const config = {
     matcher: [
       /*
        * Run on all routes except static files, image optimization, and the
        * favicon — those never need a session refresh.
        */
       '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
     ],
   }