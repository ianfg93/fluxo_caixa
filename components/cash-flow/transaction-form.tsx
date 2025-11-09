"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CashFlowService, type TransactionType, type TransactionCategory, type PaymentMethod } from "@/lib/cash-flow"
import { getTodayBrazil } from "@/lib/utils"

interface TransactionFormProps {
  type: TransactionType
  onSuccess: () => void
  onCancel: () => void
}

export function TransactionForm({ type, onSuccess, onCancel }: TransactionFormProps) {
  const [formData, setFormData] = useState({
    amount: "",
    category: "" as TransactionCategory,
    date: getTodayBrazil(),
    notes: "",
    paymentMethod: "" as PaymentMethod | "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categoryOptions = CashFlowService.getCategoryOptions(type)
  const paymentMethods = CashFlowService.getPaymentMethodOptions()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Criar a data no horário local para evitar problemas de fuso horário
      const [year, month, day] = formData.date.split('-').map(Number)
      const localDate = new Date(year, month - 1, day, 12, 0, 0)

      const result = await CashFlowService.addTransaction({
        type,
        description: formData.category.charAt(0).toUpperCase() + formData.category.slice(1),
        amount: Number.parseFloat(formData.amount),
        category: formData.category,
        date: localDate,
        notes: formData.notes || undefined,
        paymentMethod: formData.paymentMethod || undefined,
      })

      if (result) {
        onSuccess()
      } else {
        setError("Erro ao salvar a transação. Tente novamente.")
      }
    } catch (error) {
      console.error("Error adding transaction:", error)
      setError("Erro ao salvar a transação. Verifique os dados e tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nova {type === "entry" ? "Entrada" : "Saída"}</CardTitle>
        <CardDescription>Registre uma nova {type === "entry" ? "entrada" : "saída"} no fluxo de caixa</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0,00"
                required
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as TransactionCategory })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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
              <Label htmlFor="date">Data</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais sobre a transação"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Salvando..." : "Salvar Transação"}
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