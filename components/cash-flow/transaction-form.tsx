"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CashFlowService, type TransactionType, type TransactionCategory } from "@/lib/cash-flow"
import { useAuth } from "@/hooks/use-auth"
import { FileUploader } from "@/components/file-upload/file-uploader"

interface TransactionFormProps {
  type: TransactionType
  onSuccess: () => void
  onCancel: () => void
}

export function TransactionForm({ type, onSuccess, onCancel }: TransactionFormProps) {
  const { authState } = useAuth()
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "" as TransactionCategory,
    date: new Date().toISOString().split("T")[0],
    notes: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])

  const categoryOptions = CashFlowService.getCategoryOptions(type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      CashFlowService.addTransaction({
        type,
        description: formData.description,
        amount: Number.parseFloat(formData.amount),
        category: formData.category,
        date: new Date(formData.date),
        createdBy: authState.user?.name || "Unknown",
        notes: formData.notes || undefined,
        attachments: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      })

      onSuccess()
    } catch (error) {
      console.error("Error adding transaction:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "")
    const formattedValue = (Number.parseInt(numericValue) / 100).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return formattedValue
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nova {type === "entry" ? "Entrada" : "Saída"}</CardTitle>
        <CardDescription>Registre uma nova {type === "entry" ? "entrada" : "saída"} no fluxo de caixa</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva a transação"
                required
              />
            </div>
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="space-y-2">
            <Label>Anexos (opcional)</Label>
            <FileUploader
              onFilesUploaded={setUploadedFiles}
              maxFiles={5}
              acceptedTypes={["image/*", "application/pdf", ".doc", ".docx"]}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Salvando..." : "Salvar Transação"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
