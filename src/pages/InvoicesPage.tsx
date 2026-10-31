import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { listCustomers } from '../api/customers'
import {
  INVOICE_STATUSES,
  listInvoices,
  statusLabel,
  type InvoiceList,
  type InvoiceStatus,
} from '../api/invoices'
import { useAuth } from '../auth/useAuth'
import { formatPaise } from '../lib/money'
import { messageOf } from '../lib/messageOf'

const PAGE_SIZE = 10

type Result = { key: string; data: InvoiceList | null; error: string | null }

export default function InvoicesPage() {
  const { user } = useAuth()
  const canCreate = user?.role === 'owner' || user?.role === 'accountant'

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<InvoiceStatus | ''>('')
  const [result, setResult] = useState<Result | null>(null)
  const [names, setNames] = useState<Record<number, string>>({})

  const key = `${page}|${status}`

  useEffect(() => {
    let cancelled = false
    listInvoices(page, PAGE_SIZE, status)
      .then((data) => {
        if (!cancelled) setResult({ key, data, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ key, data: null, error: messageOf(err) })
      })
    return () => {
      cancelled = true
    }
  }, [key, page, status])

  // Customer names for the table (first 100 customers).
  useEffect(() => {
    let cancelled = false
    listCustomers(1, 100, '')
      .then((d) => {
        if (!cancelled) setNames(Object.fromEntries(d.items.map((c) => [c.id, c.name])))
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  const loading = result?.key !== key
  const data = result?.key === key ? result.data : null
  const loadError = result?.key === key ? result.error : null
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  function onStatus(value: string) {
    setPage(1)
    setStatus(INVOICE_STATUSES.find((s) => s === value) ?? '')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
        {canCreate && (
          <Link to="/invoices/new" className="rounded bg-slate-900 px-4 py-2 text-white">
            New invoice
          </Link>
        )}
      </div>

      <select
        value={status}
        onChange={(e) => onStatus(e.target.value)}
        className="rounded border border-slate-300 px-3 py-2"
      >
        <option value="">All statuses</option>
        {INVOICE_STATUSES.map((s) => (
          <option key={s} value={s}>
            {statusLabel(s)}
          </option>
        ))}
      </select>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {loading && <p className="text-slate-600">Loading...</p>}

      {data && (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3">Number</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No invoices found.
                  </td>
                </tr>
              )}
              {data.items.map((inv) => (
                <tr key={inv.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {inv.invoiceNumber ?? 'Draft'}
                  </td>
                  <td className="px-4 py-3">{names[inv.customerId] ?? `#${inv.customerId}`}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5">
                      {statusLabel(inv.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">{inv.dueDate ?? '-'}</td>
                  <td className="px-4 py-3 text-right">{formatPaise(inv.totalPaise)}</td>
                  <td className="px-4 py-3 text-right">{formatPaise(inv.amountPaidPaise)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={`/invoices/${inv.id}`} className="underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Page {page} of {totalPages} ({data.total} invoices)
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="rounded border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
