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

interface PaymentModalProps {
  account: AccountPayable
  isOpen: boolean
  onClose: () => void
  onConfirm: (paymentData: {
    paidAmount: number
    paidDate: Date
    paymentMethod?: string
    notes?: string
  }) => Promise<void>
}

export function PaymentModal({ account, isOpen, onClose, onConfirm }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    paidDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    notes: "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await onConfirm({
        paidAmount: account.amount, // Sempre paga o valor integral
        paidDate: new Date(formData.paidDate),
        paymentMethod: formData.paymentMethod || undefined,
        notes: formData.notes || undefined,
      })
      // onClose será chamado pelo handleSuccess na página
    } catch (error) {
      console.error("Erro ao marcar conta como paga:", error)
      alert("Erro ao processar pagamento. Tente novamente.")
    } finally {
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marcar como Pago</DialogTitle>
          <DialogDescription>
            Registre o pagamento de {account.supplierName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
            <p className="text-sm font-medium text-blue-900 mb-1">Confirmação de Pagamento Integral</p>
            <p className="text-2xl font-bold text-blue-900">{formatCurrency(account.amount)}</p>
            <p className="text-sm text-blue-700 mt-2">
              Vencimento: {new Date(account.dueDate).toLocaleDateString("pt-BR")}
            </p>
            <p className="text-xs text-blue-600 mt-2">
              Esta conta será marcada como paga integralmente
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidDate">Data do Pagamento</Label>
            <Input
              id="paidDate"
              type="date"
              value={formData.paidDate}
              onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="ted">TED</SelectItem>
                <SelectItem value="doc">DOC</SelectItem>
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
            <Label htmlFor="notes">Observações do Pagamento (opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais sobre o pagamento"
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Processando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}