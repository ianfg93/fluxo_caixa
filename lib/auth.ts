export type UserRole = "operational" | "administrator" | "master"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  userLevel: number
  companyId: string | null
  companyName: string | null
  permissions: Record<string, any>
  settings: Record<string, any>
  createdAt: Date
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
}

export class AuthService {
  private static readonly STORAGE_KEY = "cash_flow_auth"
  private static readonly TOKEN_KEY = "cash_flow_token"

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

      // Salvar tanto o user quanto o token
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user))
      localStorage.setItem(this.TOKEN_KEY, data.token)
      
      return user
    } catch (error) {
      console.error("Login error:", error)
      return null
    }
  }

  static logout(): void {
    localStorage.removeItem(this.STORAGE_KEY)
    localStorage.removeItem(this.TOKEN_KEY)
  }

  static getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem(this.TOKEN_KEY)
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
      operational: 1,
      administrator: 2, 
      master: 3,
    }
    
    return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
  }

  // Novos métodos helpers
  static isMaster(user: User): boolean {
    return user.role === 'master'
  }

  static canCreateCompanies(user: User): boolean {
    return user.permissions?.can_create_companies === true
  }

  static canManageUsers(user: User): boolean {
    return user.permissions?.can_create_users === true || this.isMaster(user)
  }
}