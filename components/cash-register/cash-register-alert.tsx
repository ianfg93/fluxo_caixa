"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertTriangle, DollarSign, X, Clock } from "lucide-react"

interface CashRegisterAlertProps {
  onOpenRegister: () => void
}

const ALERT_DISMISS_KEY = 'cashRegisterAlertDismissed'

// Opções de tempo em minutos
const TIME_OPTIONS = [
  { value: 5, label: "5 minutos" },
  { value: 10, label: "10 minutos" },
  { value: 15, label: "15 minutos" },
  { value: 30, label: "30 minutos" },
  { value: 60, label: "1 hora" },
  { value: 120, label: "2 horas" },
  { value: 240, label: "4 horas" },
]

export function CashRegisterAlert({ onOpenRegister }: CashRegisterAlertProps) {
  const [dismissed, setDismissed] = useState(false)
  const [selectedTime, setSelectedTime] = useState(15) // 15 minutos como padrão

  useEffect(() => {
    // Verificar se o alerta foi dispensado recentemente
    const dismissedData = localStorage.getItem(ALERT_DISMISS_KEY)
    if (dismissedData) {
      try {
        const { dismissedAt, duration } = JSON.parse(dismissedData)
        const currentTime = Date.now()
        const timePassed = currentTime - dismissedAt
        const durationMs = duration * 60 * 1000 // converter minutos para milissegundos

        // Se ainda não passou o tempo necessário, manter o alerta dispensado
        if (timePassed < durationMs) {
          setDismissed(true)
        } else {
          // Se já passou o tempo, remover o registro
          localStorage.removeItem(ALERT_DISMISS_KEY)
        }
      } catch (error) {
        // Se houver erro ao parsear, limpar o localStorage
        localStorage.removeItem(ALERT_DISMISS_KEY)
      }
    }
  }, [])

  const handleDismiss = () => {
    // Salvar timestamp atual e duração escolhida no localStorage
    const dismissData = {
      dismissedAt: Date.now(),
      duration: selectedTime
    }
    localStorage.setItem(ALERT_DISMISS_KEY, JSON.stringify(dismissData))
    setDismissed(true)
  }

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

            <div className="border-t pt-3 space-y-3">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Não mostrar novamente por:
                </label>
                <Select
                  value={selectedTime.toString()}
                  onValueChange={(value) => setSelectedTime(parseInt(value))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tempo" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleDismiss}
                variant="outline"
                size="lg"
                className="w-full gap-2"
              >
                <X className="h-5 w-5" />
                Fechar Aviso
              </Button>
            </div>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Você pode fechar este aviso e continuar navegando. O aviso não aparecerá novamente pelo tempo selecionado.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
