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

       const cleanUsername = username.trim()
       if (!/^[A-Za-z0-9_]+$/.test(cleanUsername)) {
         setStatus('Error: Username can only contain letters, numbers, and underscores — no spaces or other symbols.')
         return
       }

       setSaving(true)

       const { error } = await supabase.from('profiles').upsert({
         id: userId,
         username: cleanUsername,
         full_name: fullName,
         bio,
         location,
         website,
         updated_at: new Date().toISOString(),
       })

       // Keep the auth metadata (what the navbar reads) in sync with the profile.
       if (!error) {
         await supabase.auth.updateUser({ data: { username: cleanUsername } })
       }

       setSaving(false)
       if (error) {
         setStatus(`Error: ${error.message}`)
         return
       }
       // Close the editor; the header above shows the new details.
       router.replace('/profile', { scroll: false })
       router.refresh()
     }

     const fieldClass =
       'rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-ocean-500'
     const labelClass = 'flex flex-col gap-1 text-sm text-ocean-400'

     return (
       <form onSubmit={handleSave} className="flex flex-col gap-4">
         <label className={labelClass}>
           Username
           <input value={username} onChange={(e) => setUsername(e.target.value)} className={fieldClass} />
           <span className="text-xs text-ocean-600">
             Letters, numbers, and underscores only — no spaces or symbols. You
             can change your username once every 30 days.
           </span>
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

         {status && <p className="text-sm text-red-400">{status}</p>}

         <div className="mt-2 flex gap-3">
           <button
             type="submit"
             disabled={saving}
             className="flex-1 rounded-lg bg-ocean-500 px-4 py-2 font-medium text-white hover:bg-ocean-400 disabled:opacity-50"
           >
             {saving ? 'Saving…' : 'Save'}
           </button>
           <button
             type="button"
             onClick={() => router.replace('/profile', { scroll: false })}
             className="rounded-lg border border-white/15 px-4 py-2 text-ocean-200 hover:bg-white/5"
           >
             Cancel
           </button>
         </div>
       </form>
     )
   }