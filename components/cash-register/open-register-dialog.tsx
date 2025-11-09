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
import { DollarSign } from "lucide-react"

interface OpenRegisterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function OpenRegisterDialog({ open, onOpenChange, onSuccess }: OpenRegisterDialogProps) {
  const [openingAmount, setOpeningAmount] = useState("")
  const [openingNotes, setOpeningNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const amount = parseFloat(openingAmount)

      if (isNaN(amount) || amount < 0) {
        setError("Digite um valor válido")
        setIsLoading(false)
        return
      }

      await CashRegisterService.openCashRegister(amount, openingNotes)

      setOpeningAmount("")
      setOpeningNotes("")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      setError(error.message || "Erro ao abrir caixa")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Abertura de Caixa
          </DialogTitle>
          <DialogDescription>
            Informe o valor inicial em dinheiro no caixa para começar o dia.
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
              <Label htmlFor="openingAmount">Valor Inicial em Dinheiro *</Label>
              <Input
                id="openingAmount"
                type="number"
                step="0.01"
                min="0"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                placeholder="0,00"
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Digite o valor em dinheiro que está no caixa no início do dia
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingNotes">Observações (Opcional)</Label>
              <Textarea
                id="openingNotes"
                value={openingNotes}
                onChange={(e) => setOpeningNotes(e.target.value)}
                placeholder="Ex: Troco adicional de R$ 50,00 do cofre"
                rows={3}
              />
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
              {isLoading ? "Abrindo..." : "Abrir Caixa"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
