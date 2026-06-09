import { redirect } from 'next/navigation'
   import { createClient } from '@/lib/supabase/server'
   import ProfileForm from './profile-form'

   export default async function ProfilePage() {
     const supabase = await createClient()

     const {
       data: { user },
     } = await supabase.auth.getUser()

     if (!user) {
       redirect('/login')
     }

     const { data: profile } = await supabase
       .from('profiles')
       .select('username, full_name, bio, location, website')
       .eq('id', user.id)
       .maybeSingle()

     return (
       <main className="flex min-h-screen flex-col items-center px-4 pt-28">
         <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
           <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ocean-500">Your account</p>
           <h1 className="mb-1 font-display text-3xl text-white">Profile</h1>
           <p className="mb-6 text-sm text-ocean-400">{user.email}</p>
           <ProfileForm userId={user.id} profile={profile} />
         </div>
       </main>
     )
   }