import { createContext } from 'react'

export type Role = 'owner' | 'accountant' | 'sales'

export type User = {
  id: number
  orgId: number
  email: string
  fullName: string
  role: Role
}

export type AuthContextValue = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (input: {
    organizationName: string
    fullName: string
    email: string
    password: string
  }) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
