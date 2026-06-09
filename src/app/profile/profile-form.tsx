'use client'

   import { useState, type FormEvent } from 'react'
   import { useRouter } from 'next/navigation'
   import { createClient } from '@/lib/supabase/client'

   type Profile = {
     username: string | null
     full_name: string | null
     bio: string | null
     location: string | null
     website: string | null
   } | null

   export default function ProfileForm({ userId, profile }: { userId: string; profile: Profile }) {
     const router = useRouter()
     const supabase = createClient()

     const [username, setUsername] = useState(profile?.username ?? '')
     const [fullName, setFullName] = useState(profile?.full_name ?? '')
     const [bio, setBio] = useState(profile?.bio ?? '')
     const [location, setLocation] = useState(profile?.location ?? '')
     const [website, setWebsite] = useState(profile?.website ?? '')
     const [status, setStatus] = useState<string | null>(null)
     const [saving, setSaving] = useState(false)

     async function handleSave(e: FormEvent) {
       e.preventDefault()
       setStatus(null)
       setSaving(true)

       const { error } = await supabase.from('profiles').upsert({
         id: userId,
         username,
         full_name: fullName,
         bio,
         location,
         website,
         updated_at: new Date().toISOString(),
       })

       setSaving(false)
       setStatus(error ? `Error: ${error.message}` : 'Saved!')
     }

     async function handleSignOut() {
       await supabase.auth.signOut()
       router.refresh()
       router.push('/login')
     }

     const fieldClass =
       'rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-ocean-500'
     const labelClass = 'flex flex-col gap-1 text-sm text-ocean-400'

     return (
       <form onSubmit={handleSave} className="flex flex-col gap-4">
         <label className={labelClass}>
           Username
           <input value={username} onChange={(e) => setUsername(e.target.value)} className={fieldClass} />
         </label>
         <label className={labelClass}>
           Full name
           <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} />
         </label>
         <label className={labelClass}>
           Bio
           <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} className={fieldClass} />
         </label>
         <label className={labelClass}>
           Location
           <input value={location} onChange={(e) => setLocation(e.target.value)} className={fieldClass} />
         </label>
         <label className={labelClass}>
           Website
           <input value={website} onChange={(e) => setWebsite(e.target.value)} className={fieldClass} />
         </label>

         {status && (
           <p className={`text-sm ${status.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
             {status}
           </p>
         )}

         <button
           type="submit"
           disabled={saving}
           className="mt-2 rounded-lg bg-ocean-500 px-4 py-2 font-medium text-white transition hover:bg-ocean-400 disabled:opacity-50"
         >
           {saving ? 'Saving…' : 'Save changes'}
         </button>

         <button type="button" onClick={handleSignOut} className="text-sm text-ocean-400 hover:text-white">
           Sign out
         </button>
       </form>
     )
   }