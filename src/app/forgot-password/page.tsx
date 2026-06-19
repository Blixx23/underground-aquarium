'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const redirectTo = `${window.location.origin}/auth/confirm?next=/account/update-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 pt-20">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-ocean-500">Account help</p>
        <h1 className="mb-6 font-display text-3xl text-white">Reset password</h1>

        {sent ? (
          <div className="text-sm text-ocean-300">
            <p className="mb-4">
              If an account exists for <span className="text-white">{email}</span>, a reset link is on its way. Check your inbox (and your spam folder).
            </p>
            <Link href="/login" className="font-medium text-white hover:underline">
              Back to log in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-sm text-ocean-400">
              Enter your email and we&apos;ll send you a link to set a new password.
            </p>

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

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-lg bg-ocean-500 px-4 py-2 font-medium text-white transition hover:bg-ocean-400 disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <Link href="/login" className="text-sm text-ocean-400 hover:underline">
              Back to log in
            </Link>
          </form>
        )}
      </div>
    </main>
  )
}
