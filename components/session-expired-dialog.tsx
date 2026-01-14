"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { AlertTriangle } from "lucide-react"
import { useRouter } from "next/navigation"

interface SessionExpiredDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SessionExpiredDialog({
  open,
  onOpenChange,
}: SessionExpiredDialogProps) {
  const router = useRouter()

  const handleLogin = () => {
    onOpenChange(false)
    router.push("/login")
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Sessao expirada
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Sua sessao foi encerrada por inatividade. Por favor, faca login
            novamente para continuar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleLogin}>
            Fazer login
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
