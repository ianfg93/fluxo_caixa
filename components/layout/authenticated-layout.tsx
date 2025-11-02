"use client"

import type React from "react"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar } from "@/components/layout/sidebar"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface AuthenticatedLayoutProps {
  children: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { authState } = useAuth()
  const router = useRouter()
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

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
      <Sidebar onCollapsedChange={setIsSidebarCollapsed} />
      <main
        className={cn(
          "flex-1 overflow-auto transition-all duration-300 ease-in-out",
          isSidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        <div className="p-4 pt-16 lg:pt-6 md:p-8">{children}</div>
      </main>
    </div>
  )
}