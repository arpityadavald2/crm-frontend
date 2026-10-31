import { api } from './client'
import type { Customer } from './customers'

export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

export type Lead = {
  id: number
  name: string
  email: string | null
  phone: string | null
  source: string | null
  status: LeadStatus
  notes: string | null
  customerId: number | null
  createdAt: string
}

export type LeadList = {
  items: Lead[]
  page: number
  limit: number
  total: number
}

/** Empty optional fields must be null (the backend rejects empty strings for email and phone). */
export type LeadInput = {
  name: string
  email: string | null
  phone: string | null
  source: string | null
  notes: string | null
  status: LeadStatus
}

export function listLeads(
  page: number,
  limit: number,
  search: string,
  status: LeadStatus | '',
): Promise<LeadList> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) })
  if (search) params.set('search', search)
  if (status) params.set('status', status)
  return api.get<LeadList>(`/leads?${params.toString()}`)
}

export function createLead(input: LeadInput): Promise<{ lead: Lead }> {
  return api.post<{ lead: Lead }>('/leads', input)
}

export function updateLead(id: number, input: LeadInput): Promise<{ lead: Lead }> {
  return api.patch<{ lead: Lead }>(`/leads/${id}`, input)
}

export function deleteLead(id: number): Promise<void> {
  return api.delete<void>(`/leads/${id}`)
}

export function convertLead(id: number): Promise<{ lead: Lead; customer: Customer }> {
  return api.post<{ lead: Lead; customer: Customer }>(`/leads/${id}/convert`)
}
