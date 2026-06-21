'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // If this account is scheduled for deletion, route to the pending page.
    const uid = signInData.user?.id
    if (uid) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('deleted_at')
        .eq('id', uid)
        .maybeSingle()
      if (profile?.deleted_at) {
        router.refresh()
        router.push('/account/deletion-pending')
        return
      }
    }

    router.refresh()
    router.push('/profile')
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pt-20">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ocean-500">Welcome back</p>
        <h1 className="mb-6 font-display text-3xl text-white">Log in</h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-ocean-500"
            />
          </label>

          <div className="-mt-1 text-right">
            <Link href="/forgot-password" className="text-xs text-ocean-400 hover:text-white hover:underline">
              Forgot your password?
            </Link>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-lg bg-ocean-500 px-4 py-2 font-medium text-white transition hover:bg-ocean-400 disabled:opacity-50"
          >
            {loading ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-ocean-400">
          No account?{' '}
          <Link href="/register" className="font-medium text-white hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  )
}
