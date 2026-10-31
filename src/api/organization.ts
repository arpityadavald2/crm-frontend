import { api } from './client'

export type Organization = {
  id: number
  name: string
  gstin: string | null
  stateCode: string | null
}

export function getOrganization(): Promise<{ organization: Organization }> {
  return api.get<{ organization: Organization }>('/organization')
}

/** null clears the GSTIN. The server derives the state code from the GSTIN. */
export function updateGstin(gstin: string | null): Promise<{ organization: Organization }> {
  return api.patch<{ organization: Organization }>('/organization', { gstin })
}
