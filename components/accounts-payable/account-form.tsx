"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountsPayableService, type PaymentPriority, type AccountPayable } from "@/lib/accounts-payable"
import { VendorsService, type Vendor } from "@/lib/vendors"
import { getTodayBrazil, toDateStringBrazil } from "@/lib/utils"

interface AccountFormProps {
  account?: AccountPayable
  onSuccess: () => void
  onCancel: () => void
}

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loadingVendors, setLoadingVendors] = useState(true)
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null)

  const [formData, setFormData] = useState({
    vendorId: account?.vendorId || "",  // ← CORRIGIDO: agora inicializa com vendorId do account
    description: account?.description || "",
    amount: account?.amount?.toString() || "",
    dueDate: account ? toDateStringBrazil(new Date(account.dueDate)) : "",
    issueDate: account ? toDateStringBrazil(new Date(account.issueDate)) : getTodayBrazil(),
    priority: (account?.priority as PaymentPriority) || "medium",
    category: account?.category || "",
    invoiceNumber: account?.invoiceNumber || "",
    notes: account?.notes || "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadVendors = async () => {
      try {
        setLoadingVendors(true)
        const vendorsData = await VendorsService.getVendors()
        setVendors(vendorsData)
        
        // Se está editando e tem vendorId, selecionar o vendor correspondente
        if (account?.vendorId) {
          const vendor = vendorsData.find(v => v.id === account.vendorId)
          if (vendor) {
            setSelectedVendor(vendor)
          }
        }
      } catch (error) {
        console.error("Error loading vendors:", error)
        setVendors([])
      } finally {
        setLoadingVendors(false)
      }
    }

    loadVendors()
  }, [account])

  const handleVendorChange = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId)
    setSelectedVendor(vendor || null)
    setFormData(prev => ({ ...prev, vendorId }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!formData.vendorId) {
        setError("Selecione um fornecedor")
        setIsLoading(false)
        return
      }

      const accountData = {
        vendorId: formData.vendorId,
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
        result = await AccountsPayableService.updateAccountPayable(account.id, accountData)
      } else {
        result = await AccountsPayableService.addAccountPayable(accountData)
      }

      if (result) {
        onSuccess()
      } else {
        setError("Erro ao salvar conta. Tente novamente.")
      }
    } catch (error) {
      console.error("Error saving account:", error)
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

          {/* Seleção de Fornecedor */}
          <div className="space-y-2 p-4 border rounded-lg bg-slate-50">
            <Label htmlFor="vendor">Fornecedor *</Label>
            {loadingVendors ? (
              <Input value="Carregando fornecedores..." disabled />
            ) : vendors.length > 0 ? (
              <>
                <Select
                  value={formData.vendorId}
                  onValueChange={handleVendorChange}
                  required
                  disabled={!!account}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name} - {VendorsService.formatCNPJ(vendor.cnpj)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {account && (
                  <p className="text-xs text-muted-foreground mt-1">
                    ⚠️ O fornecedor não pode ser alterado após a criação da conta
                  </p>
                )}

                {selectedVendor && (
                  <div className="mt-3 p-3 bg-white border rounded text-sm space-y-1">
                    <p><strong>CNPJ:</strong> {VendorsService.formatCNPJ(selectedVendor.cnpj)}</p>
                    {selectedVendor.email && <p><strong>Email:</strong> {selectedVendor.email}</p>}
                    {selectedVendor.phone && <p><strong>Telefone:</strong> {selectedVendor.phone}</p>}
                    {selectedVendor.address && <p><strong>Endereço:</strong> {selectedVendor.address}</p>}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm text-muted-foreground">
                <p>Nenhum fornecedor cadastrado.</p>
                <p className="mt-2">Cadastre fornecedores em <strong>Fornecedores</strong> no menu lateral.</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$) *</Label>
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
              <Label htmlFor="category">Categoria *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Ex: Material de Escritório"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
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
              <Label htmlFor="issueDate">Data de Emissão *</Label>
              <Input
                id="issueDate"
                type="date"
                value={formData.issueDate}
                onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Data de Vencimento *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade *</Label>
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

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Número da Nota Fiscal</Label>
            <Input
              id="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              placeholder="Ex: NF-001234"
            />
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

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || loadingVendors || vendors.length === 0} className="flex-1">
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