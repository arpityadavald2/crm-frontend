import { useEffect, useState } from 'react'

type Status = 'loading' | 'ok' | 'error'

export default function App() {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    fetch('/api/health')
      .then((res) => setStatus(res.ok ? 'ok' : 'error'))
      .catch(() => setStatus('error'))
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-semibold text-slate-900">CRM</h1>
        <p className="mt-2 text-slate-600">
          API status:{' '}
          <span className={status === 'ok' ? 'text-green-600' : 'text-red-600'}>{status}</span>
        </p>
      </div>
    </main>
  )
}
