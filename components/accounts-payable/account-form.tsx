"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountsPayableService, type PaymentPriority, type Supplier, type AccountPayable, type CreateAccountPayable, type UpdateAccountPayable } from "@/lib/accounts-payable"
import { FileUploader } from "@/components/file-upload/file-uploader"

interface AccountFormProps {
  account?: AccountPayable // Para edição
  onSuccess: () => void
  onCancel: () => void
}

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loadingSuppliers, setLoadingSuppliers] = useState(true)
  const [formData, setFormData] = useState({
    supplierName: account?.supplierName || "",
    supplierDocument: account?.supplierDocument || "",
    supplierEmail: account?.supplierEmail || "",
    supplierPhone: account?.supplierPhone || "",
    description: account?.description || "",
    amount: account?.amount?.toString() || "",
    dueDate: account ? new Date(account.dueDate).toISOString().split("T")[0] : "",
    issueDate: account ? new Date(account.issueDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
    priority: (account?.priority as PaymentPriority) || "medium",
    category: account?.category || "",
    invoiceNumber: account?.invoiceNumber || "",
    notes: account?.notes || "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        setLoadingSuppliers(true)
        const suppliersData = await AccountsPayableService.getSuppliers()
        setSuppliers(suppliersData)
      } catch (error) {
        console.error("Erro ao carregar fornecedores:", error)
        setSuppliers([])
      } finally {
        setLoadingSuppliers(false)
      }
    }

    loadSuppliers()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // ✅ CORRIGIDO: Usar CreateAccountPayable interface
      const accountData: CreateAccountPayable = {
        supplierName: formData.supplierName,
        supplierDocument: formData.supplierDocument,
        supplierEmail: formData.supplierEmail,
        supplierPhone: formData.supplierPhone,
        description: formData.description,
        amount: Number.parseFloat(formData.amount),
        dueDate: new Date(formData.dueDate),
        issueDate: new Date(formData.issueDate),
        status: account?.status || "pending",
        priority: formData.priority,
        category: formData.category,
        invoiceNumber: formData.invoiceNumber || undefined,
        notes: formData.notes || undefined,
      }

      let result
      if (account) {
        // Editando conta existente - usar UpdateAccountPayable
        const updateData: UpdateAccountPayable = accountData
        result = await AccountsPayableService.updateAccountPayable(account.id, updateData)
      } else {
        // Criando nova conta - usar CreateAccountPayable
        result = await AccountsPayableService.addAccountPayable(accountData)
      }

      if (result) {
        onSuccess()
      } else {
        setError("Erro ao salvar conta. Tente novamente.")
      }
    } catch (error) {
      console.error("Error saving account payable:", error)
      setError("Erro ao salvar conta. Verifique os dados e tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{account ? "Editar" : "Nova"} Conta a Pagar</CardTitle>
        <CardDescription>
          {account ? "Modifique os dados da conta" : "Registre uma nova conta a pagar no sistema"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplier">Fornecedor</Label>
              {loadingSuppliers ? (
                <Input value="Carregando fornecedores..." disabled />
              ) : suppliers.length > 0 ? (
                <Select
                  value={formData.supplierName}
                  onValueChange={(value) => setFormData({ ...formData, supplierName: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.name}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="Digite o nome do fornecedor"
                  required
                />
              )}
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

          {/* Campos adicionais do fornecedor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="supplierDocument">CNPJ/CPF do Fornecedor</Label>
              <Input
                id="supplierDocument"
                value={formData.supplierDocument}
                onChange={(e) => setFormData({ ...formData, supplierDocument: e.target.value })}
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supplierEmail">Email do Fornecedor</Label>
              <Input
                id="supplierEmail"
                type="email"
                value={formData.supplierEmail}
                onChange={(e) => setFormData({ ...formData, supplierEmail: e.target.value })}
                placeholder="fornecedor@empresa.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o que está sendo pago"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="issueDate">Data de Emissão</Label>
              <Input
                id="issueDate"
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as PaymentPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Material de Escritório"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Número da Nota Fiscal</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                placeholder="Ex: NF-001234"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Informações adicionais sobre a conta"
              rows={3}
            />
          </div>

          {/* Comentar temporariamente até resolver o erro do FileUploader */}
          {/* <div className="space-y-2">
            <Label>Anexos (Notas Fiscais, Contratos, etc.)</Label>
            <FileUploader
              onFilesUploaded={setUploadedFiles}
              maxFiles={10}
              acceptedTypes={["image/*", "application/pdf", ".doc", ".docx", ".xls", ".xlsx"]}
            />
          </div> */}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || loadingSuppliers} className="flex-1">
              {isLoading ? "Salvando..." : `${account ? "Salvar Alterações" : "Salvar Conta"}`}
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