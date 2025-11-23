"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, DollarSign, X } from "lucide-react"

interface CashRegisterAlertProps {
  onOpenRegister: () => void
}

export function CashRegisterAlert({ onOpenRegister }: CashRegisterAlertProps) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-orange-200">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl">Caixa Fechado</CardTitle>
          <CardDescription className="text-base mt-2">
            O caixa ainda não foi aberto hoje. Para registrar vendas e movimentações, é necessário abrir o caixa primeiro.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="flex flex-col gap-3">
            <Button
              onClick={onOpenRegister}
              size="lg"
              className="w-full gap-2 bg-green-600 hover:bg-green-700"
            >
              <DollarSign className="h-5 w-5" />
              Abrir Caixa
            </Button>
            <Button
              onClick={() => setDismissed(true)}
              variant="outline"
              size="lg"
              className="w-full gap-2"
            >
              <X className="h-5 w-5" />
              Fechar Aviso
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Você pode fechar este aviso e continuar navegando, mas algumas funcionalidades estarão limitadas.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
