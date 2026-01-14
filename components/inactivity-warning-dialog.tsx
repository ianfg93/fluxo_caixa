"use client"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
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
}: InactivityWarningDialogProps) {
  const seconds = Math.ceil(remainingTime / 1000)

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" />
            Sessao inativa
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            Sua sessao sera encerrada automaticamente em{" "}
            <span className="font-bold text-orange-600">{seconds}</span>{" "}
            {seconds === 1 ? "segundo" : "segundos"} por inatividade.
            <br />
            <br />
            <span className="text-sm text-muted-foreground">
              Mova o mouse ou pressione qualquer tecla para continuar conectado.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  )
}
