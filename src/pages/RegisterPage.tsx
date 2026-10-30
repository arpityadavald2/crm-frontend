import { useState, type SyntheticEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'

export default function RegisterPage() {
  const { user, register } = useAuth()
  const [organizationName, setOrganizationName] = useState('')
  const [fullName, setFullName] = useState('')
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
      await register({ organizationName, fullName, email, password })
    } catch (err) {
      if (err instanceof ApiError && err.details?.length) {
        setError(err.details.map((d) => `${d.field}: ${d.message}`).join(', '))
      } else {
        setError(err instanceof ApiError ? err.message : 'Something went wrong')
      }
    } finally {
      setBusy(false)
    }
  }

  const input = 'w-full rounded border border-slate-300 px-3 py-2'

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg bg-white p-8 shadow space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Create account</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <input required placeholder="Business name" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} className={input} />
        <input required placeholder="Your name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} />
        <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        <input type="password" required minLength={12} placeholder="Password (min 12 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        <button type="submit" disabled={busy} className="w-full rounded bg-slate-900 py-2 text-white disabled:opacity-50">
          {busy ? 'Creating...' : 'Create account'}
        </button>
        <p className="text-sm text-slate-600">
          Already registered?{' '}
          <Link to="/login" className="underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  )
}
