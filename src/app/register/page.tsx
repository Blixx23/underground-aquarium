'use client'

   import { useState, type FormEvent } from 'react'
   import { useRouter } from 'next/navigation'
   import Link from 'next/link'
   import { createClient } from '@/lib/supabase/client'

   export default function RegisterPage() {
     const router = useRouter()
     const supabase = createClient()

     const [username, setUsername] = useState('')
     const [email, setEmail] = useState('')
     const [password, setPassword] = useState('')
     const [error, setError] = useState<string | null>(null)
     const [message, setMessage] = useState<string | null>(null)
     const [loading, setLoading] = useState(false)

     async function handleRegister(e: FormEvent) {
       e.preventDefault()
       setError(null)
       setMessage(null)
       setLoading(true)

       const { data, error } = await supabase.auth.signUp({
         email,
         password,
         options: {
           data: { username },
           emailRedirectTo: `${window.location.origin}/auth/callback`,
         },
       })

       if (error) {
         setError(error.message)
         setLoading(false)
         return
       }

       // If email confirmation is on, there's no session yet.
       if (data.user && !data.session) {
         setMessage('Check your email to confirm your account, then log in.')
         setLoading(false)
         return
       }

       router.refresh()
       router.push('/profile')
     }

     return (
       <main className="flex min-h-screen items-center justify-center px-4 pt-20">
         <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
           <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ocean-500">Join the tank</p>
           <h1 className="mb-6 font-display text-3xl text-white">Create account</h1>

           <form onSubmit={handleRegister} className="flex flex-col gap-4">
             <label className="flex flex-col gap-1 text-sm text-ocean-400">
               Username
               <input
                 type="text"
                 required
                 value={username}
                 onChange={(e) => setUsername(e.target.value)}
                 autoComplete="username"
                 className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-ocean-500"
               />
             </label>

             <label className="flex flex-col gap-1 text-sm text-ocean-400">
               Email
               <input
                 type="email"
                 required
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 autoComplete="email"
                 className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-ocean-500"
               />
             </label>

             <label className="flex flex-col gap-1 text-sm text-ocean-400">
               Password
               <input
                 type="password"
                 required
                 minLength={6}
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 autoComplete="new-password"
                 className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-ocean-500"
               />
             </label>

             {error && <p className="text-sm text-red-400">{error}</p>}
             {message && <p className="text-sm text-emerald-400">{message}</p>}

             <button
               type="submit"
               disabled={loading}
               className="mt-2 rounded-lg bg-ocean-500 px-4 py-2 font-medium text-white transition hover:bg-ocean-400 disabled:opacity-50"
             >
               {loading ? 'Creating account…' : 'Register'}
             </button>
           </form>

           <p className="mt-6 text-sm text-ocean-400">
             Already have an account?{' '}
             <Link href="/login" className="font-medium text-white hover:underline">
               Log in
             </Link>
           </p>
         </div>
       </main>
     )
   }