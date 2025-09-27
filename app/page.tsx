"use client"

import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/login-form"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function HomePage() {
  const { authState } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (authState.isAuthenticated && authState.user?.role !== "operational") {
      router.push("/dashboard")
    }
    else if (authState.isAuthenticated && authState.user?.role === "operational")
    {
      router.push("/cash-flow/entries")
    }
  }, [authState.isAuthenticated, router])

  if (authState.isAuthenticated) {
    return null
  }

  return <LoginForm />
}
