"use client"

import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react"
import { AuthService, type AuthState, type UserRole, type User } from "@/lib/auth"
import { useInactivityTimeout } from "./use-inactivity-timeout"
import { InactivityWarningDialog } from "@/components/inactivity-warning-dialog"

// Configuracao de tempo de inatividade (em milissegundos)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos
const WARNING_BEFORE_TIMEOUT_MS = 60 * 1000 // Aviso 60 segundos antes

const AuthContext = createContext<{
  authState: AuthState
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateUserData: (updates: Partial<User>) => void
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

  const logout = useCallback(() => {
    AuthService.logout()
    setAuthState({ user: null, isAuthenticated: false })
  }, [])

  // Hook de inatividade - so ativo quando autenticado
  const { showWarning, remainingTime, extendSession } = useInactivityTimeout({
    timeoutMs: INACTIVITY_TIMEOUT_MS,
    warningMs: WARNING_BEFORE_TIMEOUT_MS,
    onTimeout: logout,
    enabled: authState.isAuthenticated,
  })

  const updateUserData = (updates: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...updates }
      setAuthState({ user: updatedUser, isAuthenticated: true })
    }
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
      updateUserData,
      hasPermission,
      isMaster,
      canCreateCompanies,
      canManageUsers
    }}>
      {children}
      <InactivityWarningDialog
        open={showWarning}
        remainingTime={remainingTime}
        onExtendSession={extendSession}
      />
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

export type { User } from "@/lib/auth"