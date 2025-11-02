"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import type { AccountPayable } from "@/lib/accounts-payable"
import { AccountsPayableService } from "@/lib/accounts-payable"

interface PaymentModalProps {
  account: AccountPayable
  onSuccess: () => void
  onCancel: () => void
}

export function PaymentModal({ account, onSuccess, onCancel }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    paidDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    notes: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validação adicional
    if (!formData.paymentMethod) {
      setError("Selecione uma forma de pagamento")
      return
    }

    setIsLoading(true)

    try {
      await AccountsPayableService.markAsPaid(account.id, {
        paidAmount: account.amount,
        paidDate: new Date(formData.paidDate),
        paymentMethod: formData.paymentMethod,
        notes: formData.notes || undefined,
      })
      onSuccess()
    } catch (error) {
      console.error("Erro ao marcar conta como paga:", error)
      setError("Erro ao processar pagamento. Tente novamente.")
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  return (
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registro de pagamento</DialogTitle>
          <DialogDescription>
            Fornecedor: {account.vendorName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <p className="text-sm font-medium text-blue-900 mb-1">Confirmação de Pagamento</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(account.amount)}</p>
            <p className="text-sm text-blue-700 mt-2">
              Vencimento: {new Date(account.dueDate).toLocaleDateString("pt-BR")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidDate">Data do Pagamento *</Label>
            <Input
              id="paidDate"
              type="date"
              value={formData.paidDate}
              onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => {
                setFormData({ ...formData, paymentMethod: value })
                setError(null) // Limpar erro ao selecionar
              }}
              required
            >
              <SelectTrigger className={!formData.paymentMethod ? "border-red-300" : ""}>
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="ted">TED/DOC</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações do Pagamento</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais sobre o pagamento (opcional)"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.paymentMethod}>
              {isLoading ? "Processando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}