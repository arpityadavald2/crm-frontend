import { useEffect, useState, type SyntheticEvent } from 'react'
import { Link, useParams } from 'react-router'
import { getCustomer } from '../api/customers'
import {
  cancelInvoice,
  getInvoice,
  issueInvoice,
  statusLabel,
  type Invoice,
} from '../api/invoices'
import {
  PAYMENT_METHODS,
  addPayment,
  listPayments,
  type Payment,
  type PaymentMethod,
} from '../api/payments'
import { useAuth } from '../auth/useAuth'
import { todayInIndia } from '../lib/dates'
import { messageOf } from '../lib/messageOf'
import { formatPaise, rupeesToPaise } from '../lib/money'

type Result = {
  key: string
  invoice: Invoice | null
  customerName: string | null
  payments: Payment[]
  error: string | null
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const { user } = useAuth()
  const canAct = user?.role === 'owner' || user?.role === 'accountant'

  const [reload, setReload] = useState(0)
  const [result, setResult] = useState<Result | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState(todayInIndia())
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [reference, setReference] = useState('')
  const [payError, setPayError] = useState<string | null>(null)
  const [payBusy, setPayBusy] = useState(false)

  const key = `${id}|${reload}`

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { invoice } = await getInvoice(id)
        let customerName: string | null = null
        try {
          customerName = (await getCustomer(invoice.customerId)).customer.name
        } catch {
          customerName = null
        }
        let payments: Payment[] = []
        try {
          payments = (await listPayments(id)).items
        } catch {
          payments = []
        }
        if (!cancelled) setResult({ key, invoice, customerName, payments, error: null })
      } catch (err) {
        if (!cancelled) {
          setResult({ key, invoice: null, customerName: null, payments: [], error: messageOf(err) })
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [key, id])

  const loading = result?.key !== key
  const current = result?.key === key ? result : null
  const invoice = current?.invoice ?? null
  const payments = current?.payments ?? []
  const intra = invoice?.supplyType === 'intra'
  const balance = invoice ? invoice.totalPaise - invoice.amountPaidPaise : 0

  const canIssue = canAct && invoice?.status === 'draft'
  const canCancel =
    canAct &&
    invoice !== null &&
    (invoice.status === 'draft' || (invoice.status === 'issued' && invoice.amountPaidPaise === 0))
  const canPay = canAct && (invoice?.status === 'issued' || invoice?.status === 'partially_paid')

  async function onIssue() {
    if (!invoice) return
    if (!window.confirm('Issue this invoice? It gets a number and can no longer be edited.')) return
    setActionError(null)
    setNotice(null)
    setBusy(true)
    try {
      const res = await issueInvoice(invoice.id)
      setNotice(`Invoice issued: ${res.invoice.invoiceNumber ?? ''}`)
      setReload((n) => n + 1)
    } catch (err) {
      setActionError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function onCancel() {
    if (!invoice) return
    if (!window.confirm('Cancel this invoice? This cannot be undone.')) return
    setActionError(null)
    setNotice(null)
    setBusy(true)
    try {
      await cancelInvoice(invoice.id)
      setNotice('Invoice cancelled')
      setReload((n) => n + 1)
    } catch (err) {
      setActionError(messageOf(err))
    } finally {
      setBusy(false)
    }
  }

  async function onPay(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!invoice) return
    setPayError(null)
    setNotice(null)
    const paise = rupeesToPaise(amount, 100_000_000_000_000)
    if (paise === null || paise < 1) {
      setPayError('Amount must be like 500 or 500.50')
      return
    }
    setPayBusy(true)
    try {
      await addPayment(invoice.id, {
        amountPaise: paise,
        paidOn,
        method,
        reference: reference.trim() === '' ? null : reference.trim(),
      })
      setAmount('')
      setReference('')
      setNotice('Payment recorded')
      setReload((n) => n + 1)
    } catch (err) {
      setPayError(messageOf(err))
    } finally {
      setPayBusy(false)
    }
  }

  const inputClass = 'rounded border border-slate-300 px-3 py-2'

  return (
    <div className="space-y-4">
      <Link to="/invoices" className="text-sm underline">
        Back to invoices
      </Link>
      {loading && <p className="text-slate-600">Loading...</p>}
      {current?.error && <p className="text-sm text-red-600">{current.error}</p>}
      {notice && <p className="text-sm text-green-700">{notice}</p>}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {invoice && (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              Invoice {invoice.invoiceNumber ?? '(draft)'}
            </h1>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-sm">
              {statusLabel(invoice.status)}
            </span>
            <div className="ml-auto flex gap-2">
              {canIssue && (
                <button
                  onClick={onIssue}
                  disabled={busy}
                  className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                >
                  Issue invoice
                </button>
              )}
              {canCancel && (
                <button
                  onClick={onCancel}
                  disabled={busy}
                  className="rounded border border-red-300 px-4 py-2 text-red-600 disabled:opacity-50"
                >
                  Cancel invoice
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-2 rounded-lg bg-white p-6 text-sm shadow md:grid-cols-2">
            <p>
              <span className="text-slate-500">Customer: </span>
              {current?.customerName ?? `#${invoice.customerId}`}
            </p>
            <p>
              <span className="text-slate-500">Issue date: </span>
              {invoice.issueDate ?? '-'}
            </p>
            <p>
              <span className="text-slate-500">Due date: </span>
              {invoice.dueDate ?? '-'}
            </p>
            <p>
              <span className="text-slate-500">Supply: </span>
              {intra ? 'Intra-state (CGST + SGST)' : 'Inter-state (IGST)'}
            </p>
            <p>
              <span className="text-slate-500">Seller GSTIN: </span>
              {invoice.sellerGstin ?? '-'}
            </p>
            {invoice.notes && (
              <p className="md:col-span-2">
                <span className="text-slate-500">Notes: </span>
                {invoice.notes}
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg bg-white shadow">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">GST</th>
                  <th className="px-4 py-3 text-right">Taxable</th>
                  {intra ? (
                    <>
                      <th className="px-4 py-3 text-right">CGST</th>
                      <th className="px-4 py-3 text-right">SGST</th>
                    </>
                  ) : (
                    <th className="px-4 py-3 text-right">IGST</th>
                  )}
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it) => (
                  <tr key={it.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{it.description}</td>
                    <td className="px-4 py-3 text-right">{it.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatPaise(it.unitPricePaise)}</td>
                    <td className="px-4 py-3 text-right">{it.gstRateBp / 100}%</td>
                    <td className="px-4 py-3 text-right">{formatPaise(it.taxablePaise)}</td>
                    {intra ? (
                      <>
                        <td className="px-4 py-3 text-right">{formatPaise(it.cgstPaise)}</td>
                        <td className="px-4 py-3 text-right">{formatPaise(it.sgstPaise)}</td>
                      </>
                    ) : (
                      <td className="px-4 py-3 text-right">{formatPaise(it.igstPaise)}</td>
                    )}
                    <td className="px-4 py-3 text-right">{formatPaise(it.totalPaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ml-auto w-full max-w-xs space-y-1 rounded-lg bg-white p-6 text-sm shadow">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPaise(invoice.subtotalPaise)}</span>
            </div>
            {intra ? (
              <>
                <div className="flex justify-between">
                  <span>CGST</span>
                  <span>{formatPaise(invoice.cgstPaise)}</span>
                </div>
                <div className="flex justify-between">
                  <span>SGST</span>
                  <span>{formatPaise(invoice.sgstPaise)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>IGST</span>
                <span>{formatPaise(invoice.igstPaise)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
              <span>Total</span>
              <span>{formatPaise(invoice.totalPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span>Paid</span>
              <span>{formatPaise(invoice.amountPaidPaise)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Balance due</span>
              <span>{formatPaise(balance)}</span>
            </div>
          </div>

          <div className="space-y-3 rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-slate-900">Payments</h2>
            {payments.length === 0 ? (
              <p className="text-sm text-slate-500">No payments yet.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-slate-600">
                  <tr>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Method</th>
                    <th className="px-2 py-2">Reference</th>
                    <th className="px-2 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{p.paidOn}</td>
                      <td className="px-2 py-2">{p.method.replace('_', ' ')}</td>
                      <td className="px-2 py-2">{p.reference ?? '-'}</td>
                      <td className="px-2 py-2 text-right">{formatPaise(p.amountPaise)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {canPay && (
              <form onSubmit={onPay} className="space-y-3 border-t border-slate-200 pt-3">
                <h3 className="font-medium text-slate-900">Record payment</h3>
                {payError && <p className="text-sm text-red-600">{payError}</p>}
                <div className="grid grid-cols-12 gap-2">
                  <input
                    placeholder="Amount in rupees"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputClass} col-span-12 md:col-span-3`}
                  />
                  <input
                    type="date"
                    required
                    max={todayInIndia()}
                    value={paidOn}
                    onChange={(e) => setPaidOn(e.target.value)}
                    className={`${inputClass} col-span-6 md:col-span-3`}
                  />
                  <select
                    value={method}
                    onChange={(e) =>
                      setMethod(PAYMENT_METHODS.find((m) => m === e.target.value) ?? 'upi')
                    }
                    className={`${inputClass} col-span-6 md:col-span-2`}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Reference (optional)"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className={`${inputClass} col-span-12 md:col-span-4`}
                  />
                </div>
                <button
                  type="submit"
                  disabled={payBusy}
                  className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                >
                  {payBusy ? 'Saving...' : 'Record payment'}
                </button>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  )
}
