import { useEffect, useState, type SyntheticEvent } from 'react'
import { ApiError } from '../api/client'
import {
  createCustomer,
  deleteCustomer,
  listCustomers,
  updateCustomer,
  type Customer,
  type CustomerInput,
  type CustomerList,
} from '../api/customers'
import { useAuth } from '../auth/useAuth'

const PAGE_SIZE = 10

type FormState = {
  name: string
  email: string
  phone: string
  gstin: string
  billingAddress: string
}

const emptyForm: FormState = { name: '', email: '', phone: '', gstin: '', billingAddress: '' }

type Result = { key: string; data: CustomerList | null; error: string | null }

function messageOf(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.details && err.details.length > 0) {
      return err.details.map((d) => `${d.field}: ${d.message}`).join('; ')
    }
    return err.message
  }
  return 'Something went wrong'
}

function toInput(f: FormState): CustomerInput {
  const orNull = (v: string) => (v.trim() === '' ? null : v.trim())
  return {
    name: f.name.trim(),
    email: orNull(f.email),
    phone: orNull(f.phone),
    gstin: orNull(f.gstin),
    billingAddress: orNull(f.billingAddress),
  }
}

export default function CustomersPage() {
  const { user } = useAuth()
  const isOwner = user?.role === 'owner'

  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [searchText, setSearchText] = useState('')
  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const key = `${page}|${query}|${reload}`

  useEffect(() => {
    let cancelled = false
    listCustomers(page, PAGE_SIZE, query)
      .then((data) => {
        if (!cancelled) setResult({ key, data, error: null })
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ key, data: null, error: messageOf(err) })
      })
    return () => {
      cancelled = true
    }
  }, [key, page, query])

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

  function openEdit(c: Customer) {
    setEditingId(c.id)
    setForm({
      name: c.name,
      email: c.email ?? '',
      phone: c.phone ?? '',
      gstin: c.gstin ?? '',
      billingAddress: c.billingAddress ?? '',
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
    setBusy(true)
    try {
      const input = toInput(form)
      if (editingId === null) await createCustomer(input)
      else await updateCustomer(editingId, input)
      closeForm()
      setReload((n) => n + 1)
    } catch (err) {
      setFormError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(c: Customer) {
    if (!window.confirm(`Delete customer "${c.name}"?`)) return
    setActionError(null)
    try {
      await deleteCustomer(c.id)
      if (data && data.items.length === 1 && page > 1) setPage(page - 1)
      else setReload((n) => n + 1)
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

  const inputClass = 'w-full rounded border border-slate-300 px-3 py-2'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
        <button onClick={openNew} className="rounded bg-slate-900 px-4 py-2 text-white">
          Add customer
        </button>
      </div>

      {formOpen && (
        <form onSubmit={onSubmit} className="space-y-3 rounded-lg bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId === null ? 'New customer' : 'Edit customer'}
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
            placeholder="GSTIN (optional, 15 characters)"
            value={form.gstin}
            onChange={set('gstin')}
            className={inputClass}
          />
          <textarea
            placeholder="Billing address (optional)"
            value={form.billingAddress}
            onChange={set('billingAddress')}
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

      <form onSubmit={onSearch} className="flex gap-2">
        <input
          placeholder="Search customers"
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
                <th className="px-4 py-3">GSTIN</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {data.items.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No customers found.
                  </td>
                </tr>
              )}
              {data.items.map((c) => (
                <tr key={c.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-4 py-3">{c.email ?? '-'}</td>
                  <td className="px-4 py-3">{c.phone ?? '-'}</td>
                  <td className="px-4 py-3">{c.gstin ?? '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="mr-3 underline">
                      Edit
                    </button>
                    {isOwner && (
                      <button onClick={() => onDelete(c)} className="text-red-600 underline">
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
            Page {page} of {totalPages} ({data.total} customers)
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
