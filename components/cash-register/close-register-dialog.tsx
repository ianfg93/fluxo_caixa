"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card } from "@/components/ui/card"
import { CashRegisterService } from "@/lib/cash-register"
import { DollarSign, AlertCircle } from "lucide-react"

interface CloseRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  sessionId: string
  expectedAmount: number
}

export function CloseRegisterDialog({
  open,
  onOpenChange,
  onSuccess,
  sessionId,
  expectedAmount,
}: CloseRegisterDialogProps) {
  const [closingAmount, setClosingAmount] = useState("")
  const [closingNotes, setClosingNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const getDifference = (): number => {
    if (!closingAmount) return 0
    return parseFloat(closingAmount) - expectedAmount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const amount = parseFloat(closingAmount)

      if (isNaN(amount) || amount < 0) {
        setError("Digite um valor válido")
        setIsLoading(false)
        return
      }

      await CashRegisterService.closeCashRegister(sessionId, amount, closingNotes.trim() || undefined)

      setClosingAmount("")
      setClosingNotes("")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      setError(error.message || "Erro ao fechar caixa")
    } finally {
      setIsLoading(false)
    }
  }

  const difference = getDifference()
  const hasDifference = closingAmount && Math.abs(difference) >= 0.01

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Fechamento de Caixa
          </DialogTitle>
          <DialogDescription>
            Conte o dinheiro do caixa e informe o valor real para fechar o dia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {/* Valor Esperado */}
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-blue-900">💵 Dinheiro Esperado no Caixa</p>
                  <p className="text-xs text-blue-700 mt-1">
                    (Abertura + Vendas em Dinheiro - Sangrias - Saídas em Dinheiro)
                  </p>
                </div>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(expectedAmount)}</p>
              </div>
            </Card>

            {/* Valor Contado */}
            <div className="space-y-2">
              <Label htmlFor="closingAmount">Valor Contado no Caixa *</Label>
              <Input
                id="closingAmount"
                type="number"
                step="0.01"
                min="0"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                placeholder="0,00"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Conte todo o dinheiro físico presente no caixa
              </p>
            </div>

            {/* Diferença */}
            {hasDifference && (
              <Card className={`p-4 ${
                difference > 0
                  ? 'bg-blue-50 border-blue-200'
                  : 'bg-orange-50 border-orange-200'
              }`}>
                <div className="flex items-center gap-3">
                  <AlertCircle className={`h-5 w-5 ${
                    difference > 0 ? 'text-blue-600' : 'text-orange-600'
                  }`} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {difference > 0 ? 'Sobra de Caixa' : 'Falta de Caixa'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Diferença de {formatCurrency(Math.abs(difference))}
                    </p>
                  </div>
                  <p className={`text-2xl font-bold ${
                    difference > 0 ? 'text-blue-600' : 'text-orange-600'
                  }`}>
                    {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                  </p>
                </div>
              </Card>
            )}

            {/* Observações */}
            <div className="space-y-2">
              <Label htmlFor="closingNotes">Observações (Opcional)</Label>
              <Textarea
                id="closingNotes"
                value={closingNotes}
                onChange={(e) => setClosingNotes(e.target.value)}
                placeholder="Ex: Sobra destinada ao cofre, Falta justificada por..."
                rows={3}
              />
            </div>

            <div className="bg-slate-50 border rounded-md p-3">
              <p className="text-xs text-slate-700">
                ℹ️ O fechamento é definitivo. Certifique-se de que o valor contado está correto antes de confirmar.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Fechando..." : "Fechar Caixa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
