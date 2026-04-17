export type UserRole = "Super Admin" | "Admin"

export interface AuthUser {
  id?: string | number
  name: string
  email: string
  role: UserRole
}
