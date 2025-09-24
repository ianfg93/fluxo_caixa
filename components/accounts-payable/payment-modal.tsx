"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AccountsPayableService, type AccountPayable } from "@/lib/accounts-payable"

interface PaymentModalProps {
  account: AccountPayable
  onSuccess: () => void
  onCancel: () => void
}

export function PaymentModal({ account, onSuccess, onCancel }: PaymentModalProps) {
  const [paidAmount, setPaidAmount] = useState(account.amount.toString())
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0])
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      AccountsPayableService.markAsPaid(account.id, Number.parseFloat(paidAmount), new Date(paidDate))
      onSuccess()
    } catch (error) {
      console.error("Error marking as paid:", error)
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
    <Dialog open={true} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Pagamento</DialogTitle>
          <DialogDescription>Confirme os dados do pagamento da conta</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium">{account.description}</h4>
            <p className="text-sm text-muted-foreground">Fornecedor: {account.supplierName}</p>
            <p className="text-sm text-muted-foreground">Valor original: {formatCurrency(account.amount)}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paidAmount">Valor Pago (R$)</Label>
              <Input
                id="paidAmount"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                type="number"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paidDate">Data do Pagamento</Label>
              <Input
                id="paidDate"
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? "Processando..." : "Confirmar Pagamento"}
              </Button>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
