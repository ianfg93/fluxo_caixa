export type UserRole = "basic" | "manager" | "master"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: Date
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

export class AuthService {
  private static readonly STORAGE_KEY = "cash_flow_auth"

  static async login(email: string, password: string): Promise<User | null> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        return null
      }

      const data = await response.json()
      const user = {
        ...data.user,
        createdAt: new Date(data.user.createdAt),
      }

      // Store user in localStorage for client-side persistence
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
      return user
    } catch (error) {
      console.error("Login error:", error)
      return null
    }
  }

  static logout(): void {
    localStorage.removeItem(this.STORAGE_KEY)
  }

  static getCurrentUser(): User | null {
    if (typeof window === "undefined") return null

    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) return null

    try {
      const user = JSON.parse(stored)
      return {
        ...user,
        createdAt: new Date(user.createdAt),
      }
    } catch {
      return null
    }
  }

  static hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy: Record<UserRole, number> = {
      basic: 1,
      manager: 2,
      master: 3,
    }

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }
}
