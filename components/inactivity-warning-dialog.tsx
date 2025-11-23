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
import { Clock } from "lucide-react"

interface InactivityWarningDialogProps {
  open: boolean
  remainingTime: number
  onExtendSession: () => void
}

export function InactivityWarningDialog({
  open,
  remainingTime,
  onExtendSession,
}: InactivityWarningDialogProps) {
  const seconds = Math.ceil(remainingTime / 1000)

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Sessao inativa
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Sua sessao sera encerrada automaticamente em{" "}
            <span className="font-bold text-orange-600">{seconds}</span>{" "}
            {seconds === 1 ? "segundo" : "segundos"} por inatividade.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onExtendSession}>
            Continuar conectado
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
