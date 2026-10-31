import { ApiError } from '../api/client'

export function messageOf(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.details && err.details.length > 0) {
      return err.details.map((d) => `${d.field}: ${d.message}`).join('; ')
    }
    return err.message
  }
  return 'Something went wrong'
}
