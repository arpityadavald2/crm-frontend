import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from './auth/AuthProvider'
import { useAuth } from './auth/useAuth'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

function Home() {
  const { user, loading, logout } = useAuth()
  if (loading) return <p className="p-8">Loading...</p>
  if (!user) return <Navigate to="/login" replace />
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="rounded-lg bg-white p-8 shadow space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Welcome, {user.fullName}</h1>
        <p className="text-slate-600">Role: {user.role}</p>
        <button onClick={logout} className="rounded bg-slate-900 px-4 py-2 text-white">
          Log out
        </button>
      </div>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
