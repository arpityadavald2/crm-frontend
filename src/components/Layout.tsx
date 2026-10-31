import { Link, Navigate, Outlet } from 'react-router'
import { useAuth } from '../auth/useAuth'

export default function Layout() {
  const { user, loading, logout } = useAuth()
  if (loading) return <p className="p-8">Loading...</p>
  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-6">
            <span className="font-semibold text-slate-900">CRM</span>
            <Link to="/customers" className="text-slate-700 hover:text-slate-900">
              Customers
            </Link>
            <Link to="/leads" className="text-slate-700 hover:text-slate-900">
              Leads
            </Link>
            <Link to="/invoices" className="text-slate-700 hover:text-slate-900">
              Invoices
            </Link>
            <Link to="/settings" className="text-slate-700 hover:text-slate-900">
              Settings
            </Link>
          </nav>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span>
              {user.fullName} ({user.role})
            </span>
            <button onClick={logout} className="rounded bg-slate-900 px-3 py-1.5 text-white">
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
