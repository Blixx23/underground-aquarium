import { type EmailOtpType } from '@supabase/supabase-js'
   import { type NextRequest } from 'next/server'
   import { redirect } from 'next/navigation'
   import { createClient } from '@/lib/supabase/server'

   export async function GET(request: NextRequest) {
     const { searchParams } = new URL(request.url)
     const token_hash = searchParams.get('token_hash')
     const type = searchParams.get('type') as EmailOtpType | null
     const next = searchParams.get('next') ?? '/profile'

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