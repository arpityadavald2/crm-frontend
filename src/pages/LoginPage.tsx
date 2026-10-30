import { useState, type SyntheticEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'

export default function LoginPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  async function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg bg-white p-8 shadow space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Log in</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-slate-300 px-3 py-2"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-slate-900 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Logging in...' : 'Log in'}
        </button>
        <p className="text-sm text-slate-600">
          New here?{' '}
          <Link to="/register" className="underline">
            Create an account
          </Link>
        </p>
      </form>
    </main>
  )
}
