"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { AuthService, type AuthState, type UserRole } from "@/lib/auth"

const AuthContext = createContext<{
  authState: AuthState
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  hasPermission: (requiredRole: UserRole) => boolean
  isMaster: () => boolean
  canCreateCompanies: () => boolean
  canManageUsers: () => boolean
} | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
  })

  useEffect(() => {
    const user = AuthService.getCurrentUser()
    if (user) {
      setAuthState({ user, isAuthenticated: true })
    }
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    const user = await AuthService.login(email, password)
    if (user) {
      setAuthState({ user, isAuthenticated: true })
      return true
    }
    return false
  }

  const logout = () => {
    AuthService.logout()
    setAuthState({ user: null, isAuthenticated: false })
  }

  const hasPermission = (requiredRole: UserRole): boolean => {
    if (!authState.user) return false
    return AuthService.hasPermission(authState.user.role, requiredRole)
  }

  const isMaster = (): boolean => {
    if (!authState.user) return false
    return AuthService.isMaster(authState.user)
  }

  const canCreateCompanies = (): boolean => {
    if (!authState.user) return false
    return AuthService.canCreateCompanies(authState.user)
  }

  const canManageUsers = (): boolean => {
    if (!authState.user) return false
    return AuthService.canManageUsers(authState.user)
  }

  return (
    <AuthContext.Provider value={{ 
      authState, 
      login, 
      logout, 
      hasPermission,
      isMaster,
      canCreateCompanies,
      canManageUsers
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}