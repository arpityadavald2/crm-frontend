import { api } from './client'

export type Customer = {
  id: number
  name: string
  email: string | null
  phone: string | null
  gstin: string | null
  billingAddress: string | null
  stateCode: string | null
  createdAt: string
}

export type CustomerList = {
  items: Customer[]
  page: number
  limit: number
  total: number
}

/** Empty fields must be null (the backend rejects empty strings for email, phone and gstin). */
export type CustomerInput = {
  name: string
  email: string | null
  phone: string | null
  gstin: string | null
  billingAddress: string | null
}

export function listCustomers(page: number, limit: number, search: string): Promise<CustomerList> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (search) params.set('search', search)
  return api.get<CustomerList>(`/customers?${params.toString()}`)
}

export function createCustomer(input: CustomerInput): Promise<{ customer: Customer }> {
  return api.post<{ customer: Customer }>('/customers', input)
}

export function updateCustomer(id: number, input: CustomerInput): Promise<{ customer: Customer }> {
  return api.patch<{ customer: Customer }>(`/customers/${id}`, input)
}

export function deleteCustomer(id: number): Promise<void> {
  return api.delete<void>(`/customers/${id}`)
}

export function getCustomer(id: number): Promise<{ customer: Customer }> {
  return api.get<{ customer: Customer }>(`/customers/${id}`)
}
