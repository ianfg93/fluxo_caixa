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
import { CashRegisterService } from "@/lib/cash-register"
import { ArrowDownCircle } from "lucide-react"

interface WithdrawalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function WithdrawalDialog({ open, onOpenChange, onSuccess }: WithdrawalDialogProps) {
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const amountValue = parseFloat(amount)

      if (isNaN(amountValue) || amountValue <= 0) {
        setError("Digite um valor válido")
        setIsLoading(false)
        return
      }

      if (!reason.trim()) {
        setError("O motivo é obrigatório")
        setIsLoading(false)
        return
      }

      await CashRegisterService.registerWithdrawal(amountValue, reason.trim(), notes.trim() || undefined)

      setAmount("")
      setReason("")
      setNotes("")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      setError(error.message || "Erro ao registrar sangria")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5 text-orange-600" />
            Sangria de Caixa
          </DialogTitle>
          <DialogDescription>
            Registre uma retirada de dinheiro do caixa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Valor da Sangria *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Digite o valor em dinheiro que está sendo retirado do caixa
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo *</Label>
              <Input
                id="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Depósito bancário, Excesso de dinheiro"
                required
              />
              <p className="text-xs text-muted-foreground">
                Informe o motivo da retirada
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (Opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informações adicionais sobre a sangria"
                rows={3}
              />
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
              <p className="text-xs text-orange-700">
                ℹ️ A sangria será registrada e aparecerá no relatório diário. O valor será descontado do saldo final do caixa.
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
            <Button type="submit" disabled={isLoading} className="bg-orange-600 hover:bg-orange-700">
              {isLoading ? "Registrando..." : "Registrar Sangria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
