import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { INVOICE_STATUSES, getSummary, statusLabel, type DashboardSummary } from '../api/invoices'
import { messageOf } from '../lib/messageOf'
import { formatPaise } from '../lib/money'

type Result = { summary: DashboardSummary | null; error: string | null }

function Card(props: { title: string; value: string; hint?: string; alert?: boolean }) {
  return (
    <div className="rounded-lg bg-white p-5 shadow">
      <p className="text-sm text-slate-500">{props.title}</p>
      <p className={`mt-1 text-2xl font-semibold ${props.alert ? 'text-red-600' : 'text-slate-900'}`}>
        {props.value}
      </p>
      {props.hint && <p className="mt-1 text-xs text-slate-500">{props.hint}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false
    getSummary()
      .then(({ summary }) => {
        if (!cancelled) setResult({ summary, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ summary: null, error: messageOf(err) })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const summary = result?.summary ?? null

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      {result === null && <p className="text-slate-600">Loading...</p>}
      {result?.error && <p className="text-sm text-red-600">{result.error}</p>}

      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              title="Billed"
              value={formatPaise(summary.billedPaise)}
              hint="Issued, partially paid and paid invoices"
            />
            <Card title="Received" value={formatPaise(summary.receivedPaise)} />
            <Card title="Outstanding" value={formatPaise(summary.outstandingPaise)} />
            <Card
              title="Overdue"
              value={formatPaise(summary.overduePaise)}
              hint={`${summary.overdueCount} invoice(s) past the due date`}
              alert={summary.overdueCount > 0}
            />
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-3 text-lg font-semibold text-slate-900">Invoices by status</h2>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {INVOICE_STATUSES.map((s) => (
                <div key={s} className="rounded border border-slate-200 p-3">
                  <p className="text-sm text-slate-500">{statusLabel(s)}</p>
                  <p className="text-xl font-semibold text-slate-900">{summary.invoiceCounts[s]}</p>
                </div>
              ))}
            </div>
            <Link to="/invoices" className="mt-4 inline-block text-sm underline">
              View all invoices
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
