import { api } from './client'

export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'cancelled'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]

/** Valid GST slabs in basis points (1800 = 18%). */
export const GST_RATES_BP = [0, 500, 1200, 1800, 2800] as const

export type InvoiceItem = {
  id: number
  description: string
  quantity: number
  unitPricePaise: number
  gstRateBp: number
  taxablePaise: number
  cgstPaise: number
  sgstPaise: number
  igstPaise: number
  totalPaise: number
}

export type InvoiceSummary = {
  id: number
  customerId: number
  invoiceNumber: string | null
  status: InvoiceStatus
  issueDate: string | null
  dueDate: string | null
  supplyType: 'intra' | 'inter'
  sellerStateCode: string | null
  sellerGstin: string | null
  buyerStateCode: string | null
  subtotalPaise: number
  cgstPaise: number
  sgstPaise: number
  igstPaise: number
  totalPaise: number
  amountPaidPaise: number
  notes: string | null
  createdAt: string
}

export type Invoice = InvoiceSummary & { items: InvoiceItem[] }

export type InvoiceList = {
  items: InvoiceSummary[]
  page: number
  limit: number
  total: number
}

/** The client never sends totals or tax. The server calculates them. */
export type NewInvoiceItem = {
  description: string
  quantity: number
  unitPricePaise: number
  gstRateBp: number
}

export type NewInvoice = {
  customerId: number
  dueDate: string | null
  notes: string | null
  items: NewInvoiceItem[]
}

export function statusLabel(status: InvoiceStatus): string {
  return status.replace('_', ' ')
}

export function listInvoices(
  page: number,
  limit: number,
  status: InvoiceStatus | '',
): Promise<InvoiceList> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (status) params.set('status', status)
  return api.get<InvoiceList>(`/invoices?${params.toString()}`)
}

export function getInvoice(id: number): Promise<{ invoice: Invoice }> {
  return api.get<{ invoice: Invoice }>(`/invoices/${id}`)
}

export function createInvoice(input: NewInvoice): Promise<{ invoice: Invoice }> {
  return api.post<{ invoice: Invoice }>('/invoices', input)
}
