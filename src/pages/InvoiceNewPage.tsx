import { useEffect, useState, type SyntheticEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { listCustomers, type Customer } from '../api/customers'
import { GST_RATES_BP, createInvoice, type NewInvoiceItem } from '../api/invoices'
import { useAuth } from '../auth/useAuth'
import { messageOf } from '../lib/messageOf'
import { rupeesToPaise } from '../lib/money'

type Row = { uid: number; description: string; quantity: string; price: string; gstRateBp: number }

const newRow = (uid: number): Row => ({
  uid,
  description: '',
  quantity: '1',
  price: '',
  gstRateBp: 1800,
})

export default function InvoiceNewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const canCreate = user?.role === 'owner' || user?.role === 'accountant'

  const [customers, setCustomers] = useState<Customer[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [rows, setRows] = useState<Row[]>([newRow(1)])
  const [nextUid, setNextUid] = useState(2)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    listCustomers(1, 100, '')
      .then((d) => {
        if (!cancelled) setCustomers(d.items)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(messageOf(err))
      })
    return () => {
      cancelled = true
    }
  }, [])

  function updateRow(uid: number, patch: Partial<Row>) {
    setRows(rows.map((r) => (r.uid === uid ? { ...r, ...patch } : r)))
  }

  function addRow() {
    setRows([...rows, newRow(nextUid)])
    setNextUid(nextUid + 1)
  }

  function removeRow(uid: number) {
    setRows(rows.filter((r) => r.uid !== uid))
  }

  async function onSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)

    const cid = Number(customerId)
    if (!cid) {
      setError('Choose a customer')
      return
    }

    const items: NewInvoiceItem[] = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const label = `Item ${i + 1}`
      if (r.description.trim() === '') {
        setError(`${label}: description is required`)
        return
      }
      if (!/^\d+$/.test(r.quantity) || Number(r.quantity) < 1 || Number(r.quantity) > 1000) {
        setError(`${label}: quantity must be a whole number from 1 to 1000`)
        return
      }
      const paise = rupeesToPaise(r.price)
      if (paise === null) {
        setError(`${label}: price must be like 1500 or 1500.50 (max 1,00,00,000 rupees)`)
        return
      }
      items.push({
        description: r.description.trim(),
        quantity: Number(r.quantity),
        unitPricePaise: paise,
        gstRateBp: r.gstRateBp,
      })
    }

    setBusy(true)
    try {
      const res = await createInvoice({
        customerId: cid,
        dueDate: dueDate === '' ? null : dueDate,
        notes: notes.trim() === '' ? null : notes.trim(),
        items,
      })
      navigate(`/invoices/${res.invoice.id}`)
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
    }
  }

  const inputClass = 'rounded border border-slate-300 px-3 py-2'

  if (!canCreate) {
    return (
      <div className="space-y-2">
        <p className="text-slate-700">Your role cannot create invoices.</p>
        <Link to="/invoices" className="underline">
          Back to invoices
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">New invoice</h1>
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="space-y-3 rounded-lg bg-white p-6 shadow">
        <select
          required
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          className={`${inputClass} w-full`}
        >
          <option value="">{customers ? 'Choose customer' : 'Loading customers...'}</option>
          {customers?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="block text-sm text-slate-600">
          Due date (optional)
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={`${inputClass} mt-1 block`}
          />
        </label>
        <textarea
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className={`${inputClass} w-full`}
          rows={2}
        />
      </div>

      <div className="space-y-3 rounded-lg bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">Items</h2>
        {rows.map((r, i) => (
          <div key={r.uid} className="grid grid-cols-12 gap-2">
            <input
              placeholder={`Item ${i + 1} description`}
              value={r.description}
              onChange={(e) => updateRow(r.uid, { description: e.target.value })}
              className={`${inputClass} col-span-12 md:col-span-4`}
            />
            <input
              placeholder="Qty"
              inputMode="numeric"
              value={r.quantity}
              onChange={(e) => updateRow(r.uid, { quantity: e.target.value })}
              className={`${inputClass} col-span-3 md:col-span-1`}
            />
            <input
              placeholder="Price in rupees"
              inputMode="decimal"
              value={r.price}
              onChange={(e) => updateRow(r.uid, { price: e.target.value })}
              className={`${inputClass} col-span-5 md:col-span-3`}
            />
            <select
              value={String(r.gstRateBp)}
              onChange={(e) => updateRow(r.uid, { gstRateBp: Number(e.target.value) })}
              className={`${inputClass} col-span-4 md:col-span-2`}
            >
              {GST_RATES_BP.map((bp) => (
                <option key={bp} value={bp}>
                  GST {bp / 100}%
                </option>
              ))}
            </select>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeRow(r.uid)}
                className="col-span-12 text-left text-sm text-red-600 underline md:col-span-2"
              >
                Remove
              </button>
            )}
          </div>
        ))}
        {rows.length < 100 && (
          <button type="button" onClick={addRow} className="underline">
            Add item
          </button>
        )}
        <p className="text-sm text-slate-500">
          Tax and totals are calculated by the server after you save the draft.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? 'Saving...' : 'Save draft'}
        </button>
        <Link to="/invoices" className="rounded border border-slate-300 px-4 py-2">
          Cancel
        </Link>
      </div>
    </form>
  )
}
