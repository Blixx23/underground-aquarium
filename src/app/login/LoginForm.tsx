'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { nextFromLocation } from '@/lib/safeNext'
import { useCarrySearch } from '@/lib/hooks/useCarrySearch'
import GoogleButton from '@/components/auth/GoogleButton'
import AppleButton from '@/components/auth/AppleButton'

export default function LoginForm({ notice = null }: { notice?: string | null }) {
  const router = useRouter()
  const carry = useCarrySearch()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // Phones sometimes add a space or a capital letter to the email; neither should block a sign-in.
    const { data: signInData, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })

    if (error) {
      // A suspended account is banned in Supabase Auth: explain it on its own
      // page instead of showing Supabase's raw "User is banned" text.
      if (error.code === 'user_banned' || /banned/i.test(error.message ?? '')) {
        router.push('/account-suspended')
        return
      }
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
        window.location.assign('/account/deletion-pending')
        return
      }
    }

    // Back to wherever sent them here (Trophies, the member area...). A full
    // page load, so nothing rendered while signed out is reused; otherwise
    // the page could sit looking stuck until a reload (seen in the app).
    window.location.assign(nextFromLocation('/feed'))
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pt-20">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ocean-500">Welcome back</p>
        <h1 className="mb-6 font-display text-3xl text-white">Log in</h1>

        {/* Why they were sent back here (an expired or broken link). Only
            shown until they try again, so it doesn't sit next to a new error. */}
        {notice && !error && !loading && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200"
          >
            {notice}
          </div>
        )}

        {/* Apple first: its rules say it can't be less prominent than Google. */}
        <div className="flex flex-col gap-2.5">
          <AppleButton />
          <GoogleButton />
        </div>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-ocean-600">
          <span className="h-px flex-1 bg-white/10" />
          or
          <span className="h-px flex-1 bg-white/10" />
        </div>

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
          <Link href={`/register${carry}`} className="font-medium text-white hover:underline">
            Register
          </Link>
        </p>
      </div>
    </main>
  )
}
