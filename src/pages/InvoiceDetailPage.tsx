import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getCustomer } from '../api/customers'
import { getInvoice, statusLabel, type Invoice } from '../api/invoices'
import { messageOf } from '../lib/messageOf'
import { formatPaise } from '../lib/money'

type Result = {
  key: string
  invoice: Invoice | null
  customerName: string | null
  error: string | null
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const id = Number(params.id)
  const [result, setResult] = useState<Result | null>(null)

  const key = String(id)

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
        if (!cancelled) setResult({ key, invoice, customerName, error: null })
      } catch (err) {
        if (!cancelled) setResult({ key, invoice: null, customerName: null, error: messageOf(err) })
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
  const intra = invoice?.supplyType === 'intra'

  return (
    <div className="space-y-4">
      <Link to="/invoices" className="text-sm underline">
        Back to invoices
      </Link>
      {loading && <p className="text-slate-600">Loading...</p>}
      {current?.error && <p className="text-sm text-red-600">{current.error}</p>}

      {invoice && (
        <>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              Invoice {invoice.invoiceNumber ?? '(draft)'}
            </h1>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-sm">
              {statusLabel(invoice.status)}
            </span>
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
              <span>{formatPaise(invoice.totalPaise - invoice.amountPaidPaise)}</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
