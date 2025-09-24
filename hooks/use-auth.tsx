"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { AuthService, type AuthState } from "@/lib/auth"

const AuthContext = createContext<{
  authState: AuthState
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  hasPermission: (requiredRole: "basic" | "manager" | "master") => boolean
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

  const hasPermission = (requiredRole: "basic" | "manager" | "master"): boolean => {
    if (!authState.user) return false
    return AuthService.hasPermission(authState.user.role, requiredRole)
  }

  return <AuthContext.Provider value={{ authState, login, logout, hasPermission }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
