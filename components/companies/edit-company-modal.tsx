"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { CompaniesService, type Company } from "@/lib/companies"

interface EditCompanyModalProps {
  company: Company
  onSuccess: () => void
  onCancel: () => void
}

export function EditCompanyModal({ company, onSuccess, onCancel }: EditCompanyModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  const [companyData, setCompanyData] = useState({
    name: company.name,
    tradeName: company.tradeName || "",
    cnpj: company.cnpj || "",
    cpf: company.cpf || "",
    email: company.email || "",
    phone: company.phone || "",
    address: company.address || "",
    city: company.city || "",
    state: company.state || "",
    zipCode: company.zipCode || "",
    subscriptionPlan: company.subscriptionPlan,
    subscriptionExpiresAt: company.subscriptionExpiresAt 
      ? company.subscriptionExpiresAt.toISOString().split('T')[0] 
      : "",
    maxUsers: company.maxUsers,
    maxTransactionsPerMonth: company.maxTransactionsPerMonth,
    active: company.active,
  })

  const validateForm = () => {
    const newErrors: string[] = []

    if (!companyData.name.trim()) {
      newErrors.push("Nome da empresa é obrigatório")
    }

    // Validar se tem CNPJ ou CPF
    if (!companyData.cnpj && !companyData.cpf) {
      newErrors.push("CNPJ ou CPF é obrigatório")
    }

    if (newErrors.length > 0) {
      setError(newErrors.join(", "))
      return false
    }

    setError("")
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setError("")

    try {
      const updateData = {
        ...companyData,
        subscriptionExpiresAt: companyData.subscriptionExpiresAt 
          ? new Date(companyData.subscriptionExpiresAt)
          : undefined,
      }

      const result = await CompaniesService.updateCompany(company.id, updateData)
      
      if (result) {
        onSuccess()
      } else {
        setError("Erro ao atualizar empresa")
      }
    } catch (error) {
      console.error("Erro ao atualizar empresa:", error)
      setError("Erro ao atualizar empresa")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Empresa</DialogTitle>
          <DialogDescription>
            Atualize as informações da empresa {company.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção da Empresa */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Dados da Empresa</h3>
            
            <div className="space-y-2">
              <Label htmlFor="company-name">Nome da Empresa *</Label>
              <Input
                id="company-name"
                value={companyData.name}
                onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                placeholder="Empresa Exemplo Ltda"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-tradeName">Nome Fantasia</Label>
              <Input
                id="company-tradeName"
                value={companyData.tradeName}
                onChange={(e) => setCompanyData({ ...companyData, tradeName: e.target.value })}
                placeholder="Exemplo Corp"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-cnpj">CNPJ</Label>
                <Input
                  id="company-cnpj"
                  value={companyData.cnpj}
                  onChange={(e) => setCompanyData({ ...companyData, cnpj: e.target.value })}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-cpf">CPF (MEI)</Label>
                <Input
                  id="company-cpf"
                  value={companyData.cpf}
                  onChange={(e) => setCompanyData({ ...companyData, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-email">Email da Empresa</Label>
                <Input
                  id="company-email"
                  type="email"
                  value={companyData.email}
                  onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                  placeholder="contato@empresa.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-phone">Telefone</Label>
                <Input
                  id="company-phone"
                  value={companyData.phone}
                  onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company-address">Endereço</Label>
              <Input
                id="company-address"
                value={companyData.address}
                onChange={(e) => setCompanyData({ ...companyData, address: e.target.value })}
                placeholder="Rua, número, bairro"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-city">Cidade</Label>
                <Input
                  id="company-city"
                  value={companyData.city}
                  onChange={(e) => setCompanyData({ ...companyData, city: e.target.value })}
                  placeholder="São Paulo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-state">Estado</Label>
                <Input
                  id="company-state"
                  value={companyData.state}
                  onChange={(e) => setCompanyData({ ...companyData, state: e.target.value.toUpperCase() })}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-zipCode">CEP</Label>
                <Input
                  id="company-zipCode"
                  value={companyData.zipCode}
                  onChange={(e) => setCompanyData({ ...companyData, zipCode: e.target.value })}
                  placeholder="00000-000"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Seção de Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status da Empresa</h3>
            
            <div className="space-y-2">
              <Label htmlFor="company-status">Status</Label>
              <Select 
                value={companyData.active ? "active" : "inactive"} 
                onValueChange={(value) => setCompanyData({ ...companyData, active: value === "active" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="inactive">Inativa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Seção de Configurações do Plano */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Configurações do Plano</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subscription-plan">Plano de Assinatura</Label>
                <Select 
                  value={companyData.subscriptionPlan} 
                  onValueChange={(value) => setCompanyData({ ...companyData, subscriptionPlan: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscription-expires">Data de Expiração</Label>
                <Input
                  id="subscription-expires"
                  type="date"
                  value={companyData.subscriptionExpiresAt}
                  onChange={(e) => setCompanyData({ ...companyData, subscriptionExpiresAt: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max-users">Máximo de Usuários</Label>
                <Input
                  id="max-users"
                  type="number"
                  min="1"
                  value={companyData.maxUsers}
                  onChange={(e) => setCompanyData({ ...companyData, maxUsers: parseInt(e.target.value) || 5 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="max-transactions">Transações/Mês</Label>
                <Input
                  id="max-transactions"
                  type="number"
                  min="1"
                  value={companyData.maxTransactionsPerMonth}
                  onChange={(e) => setCompanyData({ ...companyData, maxTransactionsPerMonth: parseInt(e.target.value) || 1000 })}
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}