"use client"

import type React from "react"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar } from "@/components/layout/sidebar"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { authState } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authState.isAuthenticated) {
      router.push("/")
    }
  }, [authState.isAuthenticated, router])

  if (!authState.isAuthenticated) {
    return null // Will redirect to login
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 ml-64 overflow-auto">
        <div className="p-6 md:p-8">{children}</div>
      </main>
    </div>
  )
}