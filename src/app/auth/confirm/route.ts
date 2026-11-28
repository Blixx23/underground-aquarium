import { type EmailOtpType } from '@supabase/supabase-js'
   import { type NextRequest } from 'next/server'
   import { redirect } from 'next/navigation'
   import { createClient } from '@/lib/supabase/server'
   import { safeNext } from '@/lib/safeNext'

   /**
    * The sign-up and password emails link straight here (on our own domain, so
    * a phone with the app installed opens the app). Their "next" can be a full
    * address from Supabase, e.g. https://www.undergroundaquarium.com/auth/callback?next=/claim/x.
    * Boil that down to the page on this site the person was headed to.
    */
   function pagePath(raw: string | null): string | null {
     if (!raw || raw.startsWith('/')) return raw
     try {
       const u = new URL(raw)
       if (!/(^|\.)undergroundaquarium\.com$/.test(u.hostname)) return null
       if (u.pathname === '/auth/callback' || u.pathname === '/auth/confirm') return u.searchParams.get('next')
       return `${u.pathname}${u.search}`
     } catch {
       return null
     }
   }

   export async function GET(request: NextRequest) {
     const { searchParams } = new URL(request.url)
     const token_hash = searchParams.get('token_hash')
     const type = searchParams.get('type') as EmailOtpType | null
     const next = safeNext(pagePath(searchParams.get('next')), '/feed')

     if (token_hash && type) {
       const supabase = await createClient()
       const { error } = await supabase.auth.verifyOtp({ type, token_hash })
       if (!error) {
         redirect(next)
       }
     }

     // Something was wrong with the link — send them to login with a note.
     redirect('/login?error=Could not confirm email')
   }