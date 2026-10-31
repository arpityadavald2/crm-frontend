import { api } from './client'
import type { Invoice } from './invoices'

export const PAYMENT_METHODS = ['cash', 'upi', 'bank_transfer', 'cheque', 'card'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export type Payment = {
  id: number
  invoiceId: number
  amountPaise: number
  paidOn: string
  method: PaymentMethod
  reference: string | null
  createdAt: string
}

export type NewPayment = {
  amountPaise: number
  paidOn: string
  method: PaymentMethod
  reference: string | null
}

export function listPayments(invoiceId: number): Promise<{ items: Payment[] }> {
  return api.get<{ items: Payment[] }>(`/invoices/${invoiceId}/payments`)
}

export function addPayment(
  invoiceId: number,
  input: NewPayment,
): Promise<{ payment: Payment; invoice: Invoice }> {
  return api.post<{ payment: Payment; invoice: Invoice }>(`/invoices/${invoiceId}/payments`, input)
}
