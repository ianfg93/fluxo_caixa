"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Plus } from "lucide-react"
import { CompaniesService } from "@/lib/companies"

interface CreateCompanyModalProps {
  onCompanyCreated?: () => void
}

export function CreateCompanyModal({ onCompanyCreated }: CreateCompanyModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  
  // Dados da empresa
  const [companyData, setCompanyData] = useState({
    name: "",
    tradeName: "",
    cnpj: "",
    cpf: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    subscriptionPlan: "basic",
    subscriptionExpiresAt: "",
    maxUsers: 5,
    maxTransactionsPerMonth: 1000,
    settings: {},
  })

  // Dados do usuário admin
  const [adminData, setAdminData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const validateForm = () => {
    const newErrors: string[] = []

    // Validação da empresa
    if (!companyData.name.trim()) {
      newErrors.push("Nome da empresa é obrigatório")
    }

    // Validação do admin
    if (!adminData.name.trim()) {
      newErrors.push("Nome do administrador é obrigatório")
    }

    if (!adminData.email.trim()) {
      newErrors.push("Email do administrador é obrigatório")
    } else if (!/\S+@\S+\.\S+/.test(adminData.email)) {
      newErrors.push("Email do administrador inválido")
    }

    if (!adminData.password) {
      newErrors.push("Senha é obrigatória")
    } else if (adminData.password.length < 6) {
      newErrors.push("Senha deve ter pelo menos 6 caracteres")
    }

    if (adminData.password !== adminData.confirmPassword) {
      newErrors.push("Senhas não coincidem")
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
      // Criar empresa junto com o usuário admin
      const result = await CompaniesService.createCompanyWithAdmin({
        company: {
          ...companyData,
          subscriptionExpiresAt: companyData.subscriptionExpiresAt
            ? new Date(companyData.subscriptionExpiresAt)
            : undefined,
        },
        admin: {
          name: adminData.name,
          email: adminData.email,
          password: adminData.password,
        }
      })
      
      if (result) {
        setOpen(false)
        onCompanyCreated?.()
        
        // Reset forms
        setCompanyData({
          name: "",
          tradeName: "",
          cnpj: "",
          cpf: "",
          email: "",
          phone: "",
          address: "",
          city: "",
          state: "",
          zipCode: "",
          subscriptionPlan: "basic",
          subscriptionExpiresAt: "",
          maxUsers: 5,
          maxTransactionsPerMonth: 1000,
          settings: {},
        })
        
        setAdminData({
          name: "",
          email: "",
          password: "",
          confirmPassword: "",
        })
      } else {
        setError("Erro ao criar empresa e usuário")
      }
    } catch (error) {
      console.error("Erro ao criar empresa:", error)
      setError("Erro ao criar empresa e usuário")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Empresa</DialogTitle>
          <DialogDescription>
            Preencha os dados da nova empresa e do usuário administrador que será criado no sistema.
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

          <Separator />

          {/* Seção do Usuário Admin */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Usuário Administrador</h3>
            <p className="text-sm text-muted-foreground">
              Este usuário será o administrador principal da empresa
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="admin-name">Nome Completo *</Label>
              <Input
                id="admin-name"
                value={adminData.name}
                onChange={(e) => setAdminData({ ...adminData, name: e.target.value })}
                placeholder="João Silva"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-email">Email *</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminData.email}
                onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                placeholder="joao@empresa.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin-password">Senha *</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminData.password}
                  onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="admin-confirmPassword"
                  type="password"
                  value={adminData.confirmPassword}
                  onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                  placeholder="Repita a senha"
                  required
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Criando..." : "Criar Empresa e Usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}