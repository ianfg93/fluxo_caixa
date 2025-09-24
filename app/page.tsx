"use client"

import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/login-form"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function HomePage() {
  const { authState } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authState.isAuthenticated) {
      router.push("/dashboard")
    }
  }, [authState.isAuthenticated, router])

  if (authState.isAuthenticated) {
    return null // Will redirect to dashboard
  }

  return <LoginForm />
}
