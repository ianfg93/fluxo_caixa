"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { CashFlowService, type PaymentMethod } from "@/lib/cash-flow"
import { type Customer } from "@/lib/customers"
import { DollarSign, AlertCircle } from "lucide-react"

interface PaymentFormProps {
  customer: Customer
  onSuccess: () => void
  onCancel: () => void
}

export function PaymentForm({ customer, onSuccess, onCancel }: PaymentFormProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    paymentMethod: "" as PaymentMethod | "",
    notes: "",
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const paymentMethods = CashFlowService.getPaymentMethodOptions().filter(m => m.value !== 'a_prazo')

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const amount = parseFloat(formData.amount)

      if (amount <= 0) {
        setError("O valor do pagamento deve ser maior que zero")
        setIsLoading(false)
        return
      }

      if (customer.balance && amount > customer.balance) {
        setError(`O valor do pagamento (${formatCurrency(amount)}) é maior que o saldo devedor (${formatCurrency(customer.balance)})`)
        setIsLoading(false)
        return
      }

      const transactionData: any = {
        type: "entry",
        description: `Pagamento - ${customer.name}`,
        amount: amount,
        category: "vendas",
        date: new Date(formData.date),
        paymentMethod: formData.paymentMethod || undefined,
        customerId: customer.id,
        amountReceived: amount, // Pagamento recebe o valor total
        notes: `Pagamento de conta a prazo\nCliente: ${customer.name}${customer.cpfCnpj ? `\nCPF/CNPJ: ${customer.cpfCnpj}` : ''}${formData.notes ? `\n\nObservações: ${formData.notes}` : ''}`,
      }

      const result = await CashFlowService.addTransaction(transactionData)

      if (!result) {
        setError("Erro ao registrar pagamento. Tente novamente.")
        return
      }

      onSuccess()
    } catch (error) {
      console.error("Error adding payment:", error)
      setError("Erro ao registrar pagamento. Verifique os dados e tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Registrar Pagamento
        </CardTitle>
        <CardDescription>
          Registre um pagamento de conta a prazo do cliente {customer.name}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md flex items-start gap-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Informações do Cliente */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">Cliente</h3>
            <p className="text-sm"><strong>Nome:</strong> {customer.name}</p>
            {customer.cpfCnpj && <p className="text-sm"><strong>CPF/CNPJ:</strong> {customer.cpfCnpj}</p>}
            {customer.balance !== undefined && (
              <p className="text-sm mt-2">
                <strong>Saldo Devedor:</strong> 
                <span className={`ml-2 font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(customer.balance)}
                </span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data do Pagamento *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Valor Pago *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Forma de Pagamento *</Label>
            <Select
              value={formData.paymentMethod}
              onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
              required
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Selecione a forma de pagamento" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais sobre o pagamento..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Registrando..." : "Registrar Pagamento"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}