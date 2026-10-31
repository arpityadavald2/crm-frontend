import { useEffect, useState, type SyntheticEvent } from 'react'
import { ApiError } from '../api/client'
import {
  LEAD_STATUSES,
  convertLead,
  createLead,
  deleteLead,
  listLeads,
  updateLead,
  type Lead,
  type LeadInput,
  type LeadList,
  type LeadStatus,
} from '../api/leads'
import { useAuth } from '../auth/useAuth'

const PAGE_SIZE = 10

type FormState = {
  name: string
  email: string
  phone: string
  source: string
  notes: string
  status: LeadStatus
}

const emptyForm: FormState = {
  name: '',
  email: '',
  phone: '',
  source: '',
  notes: '',
  status: 'new',
}

type Result = { key: string; data: LeadList | null; error: string | null }

function messageOf(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.details && err.details.length > 0) {
      return err.details.map((d) => `${d.field}: ${d.message}`).join('; ')
    }
    return err.message
  }
  return 'Something went wrong'
}

function toInput(f: FormState): LeadInput {
  const orNull = (v: string) => (v.trim() === '' ? null : v.trim())
  return {
    name: f.name.trim(),
    email: orNull(f.email),
    phone: orNull(f.phone),
    source: orNull(f.source),
    notes: orNull(f.notes),
    status: f.status,
  }
}

export default function LeadsPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | ''>('')
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const key = `${page}|${query}|${statusFilter}|${reload}`

  useEffect(() => {
    let cancelled = false
    listLeads(page, PAGE_SIZE, query, statusFilter)
      .then((data) => {
        if (!cancelled) setResult({ key, data, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ key, data: null, error: messageOf(err) })
      })
    return () => {
      cancelled = true
    }
  }, [key, page, query, statusFilter])

  const loading = result?.key !== key
  const data = result?.key === key ? result.data : null
  const loadError = result?.key === key ? result.error : null
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1

  const set = (field: keyof FormState) => (e: { target: { value: string } }) =>
    setForm({ ...form, [field]: e.target.value })

  function openNew() {
    setEditingId(null)
    setForm(emptyForm)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(l: Lead) {
    setEditingId(l.id)
    setForm({
      name: l.name,
      email: l.email ?? '',
      phone: l.phone ?? '',
      source: l.source ?? '',
      notes: l.notes ?? '',
      status: l.status,
    })
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setFormError(null)
  }

  async function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    setNotice(null)
    setBusy(true)
    try {
      const input = toInput(form)
      if (editingId === null) await createLead(input)
      else await updateLead(editingId, input)
      closeForm()
      setReload((n) => n + 1)
    } catch (err) {
      setFormError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(l: Lead) {
    if (!window.confirm(`Delete lead "${l.name}"?`)) return
    setActionError(null)
    setNotice(null)
    try {
      await deleteLead(l.id)
      if (data && data.items.length === 1 && page > 1) setPage(page - 1)
      else setReload((n) => n + 1)
    } catch (err) {
      setActionError(messageOf(err))
    }
  }

  async function onConvert(l: Lead) {
    if (!window.confirm(`Convert lead "${l.name}" into a customer?`)) return
    setActionError(null)
    setNotice(null)
    try {
      await convertLead(l.id)
      setNotice(`"${l.name}" is now a customer. You can see it on the Customers page.`)
      setReload((n) => n + 1)
    } catch (err) {
      setActionError(messageOf(err))
    }
  }

  function onSearch(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setPage(1)
    setQuery(searchText.trim())
  }

  function clearSearch() {
    setSearchText('')
    setPage(1)
    setQuery('')
  }

  function onStatusFilter(value: string) {
    setPage(1)
    setStatusFilter(LEAD_STATUSES.find((s) => s === value) ?? '')
  }

  const inputClass = 'w-full rounded border border-slate-300 px-3 py-2'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Leads</h1>
        <button onClick={openNew} className="rounded bg-slate-900 px-4 py-2 text-white">
          Add lead
        </button>
      </div>

      {formOpen && (
        <form onSubmit={onSubmit} className="space-y-3 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId === null ? 'New lead' : 'Edit lead'}
          </h2>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <input
            required
            minLength={2}
            placeholder="Name"
            value={form.name}
            onChange={set('name')}
            className={inputClass}
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={form.email}
            onChange={set('email')}
            className={inputClass}
          />
          <input
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={set('phone')}
            className={inputClass}
          />
          <input
            placeholder="Source (optional, e.g. website, referral)"
            value={form.source}
            onChange={set('source')}
            className={inputClass}
          />
          <select value={form.status} onChange={set('status')} className={inputClass}>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <textarea
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={set('notes')}
            className={inputClass}
            rows={3}
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
            >
              {busy ? 'Saving...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded border border-slate-300 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-2">
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            placeholder="Search leads"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="w-full max-w-sm rounded border border-slate-300 px-3 py-2"
          />
          <button type="submit" className="rounded bg-slate-900 px-4 py-2 text-white">
            Search
          </button>
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded border border-slate-300 px-4 py-2"
            >
              Clear
            </button>
          )}
        </form>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilter(e.target.value)}
          className="rounded border border-slate-300 px-3 py-2"
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {notice && <p className="text-sm text-green-700">{notice}</p>}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {loading && <p className="text-slate-600">Loading...</p>}

      {data && (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                    No leads found.
                  </td>
                </tr>
              )}
              {data.items.map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{l.name}</td>
                  <td className="px-4 py-3">{l.email ?? '-'}</td>
                  <td className="px-4 py-3">{l.phone ?? '-'}</td>
                  <td className="px-4 py-3">{l.source ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5">{l.status}</span>
                    {l.customerId !== null && (
                      <span className="ml-2 text-xs text-green-700">customer</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(l)} className="mr-3 underline">
                      Edit
                    </button>
                    {l.customerId === null && (
                      <button onClick={() => onConvert(l)} className="mr-3 underline">
                        Convert
                      </button>
                    )}
                    {isOwner && (
                      <button onClick={() => onDelete(l)} className="text-red-600 underline">
                        Delete
                      </button>
                    )}
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
            Page {page} of {totalPages} ({data.total} leads)
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
