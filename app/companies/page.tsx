"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Edit, ToggleLeft, ToggleRight, Building2, Users, CreditCard, Search } from "lucide-react"
import { CreateCompanyModal } from "@/components/companies/create-company-modal"
import { EditCompanyModal } from "@/components/companies/edit-company-modal"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { CompaniesService, type Company } from "@/lib/companies"
import { useAuth } from "@/hooks/use-auth"
import { formatDate } from "@/lib/utils"

export default function CompaniesPage() {
  const { hasPermission } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  // Verificar permissão - só master pode acessar
  if (!hasPermission('master')) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground">Apenas usuários master podem gerenciar empresas.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  // Filtrar empresas por nome
  const filteredCompanies = useMemo(() => {
    if (!searchTerm.trim()) return companies

    return companies.filter(company => 
      company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (company.tradeName && company.tradeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (company.cnpj && company.cnpj.includes(searchTerm)) ||
      (company.cpf && company.cpf.includes(searchTerm))
    )
  }, [companies, searchTerm])

  const loadCompanies = async () => {
    setLoading(true)
    const data = await CompaniesService.getCompanies()
    setCompanies(data)
    setLoading(false)
  }

  const handleToggleStatus = async (company: Company) => {
    const success = await CompaniesService.toggleCompanyStatus(company.id)
    if (success) {
      await loadCompanies() // Recarregar lista
    }
  }

  const handleEditSuccess = async () => {
    setEditingCompany(null)
    await loadCompanies()
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Empresas</h1>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Empresas</h1>
            <p className="text-muted-foreground">
              Gerencie todas as empresas do sistema
            </p>
          </div>
          <CreateCompanyModal onCompanyCreated={loadCompanies} />
        </div>

        {/* Filtro de busca */}
        <div className="flex items-center space-x-2 max-w-sm">
          <Input
            placeholder="Buscar por nome, CNPJ ou CPF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredCompanies.length}</div>
              {searchTerm && (
                <p className="text-xs text-muted-foreground mt-1">
                  {filteredCompanies.length} de {companies.length} empresas
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas Ativas</CardTitle>
              <ToggleRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredCompanies.filter(c => c.active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empresas Inativas</CardTitle>
              <ToggleLeft className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredCompanies.filter(c => !c.active).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companies Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className={company.active ? "" : "opacity-60"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <Badge variant={company.active ? "default" : "secondary"}>
                    {company.active ? "Ativa" : "Inativa"}
                  </Badge>
                </div>
                {company.tradeName && (
                  <CardDescription>{company.tradeName}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  {company.cnpj && (
                    <p><span className="font-medium">CNPJ:</span> {company.cnpj}</p>
                  )}
                  {company.cpf && (
                    <p><span className="font-medium">CPF:</span> {company.cpf}</p>
                  )}
                  {company.email && (
                    <p><span className="font-medium">Email:</span> {company.email}</p>
                  )}
                  {company.phone && (
                    <p><span className="font-medium">Telefone:</span> {company.phone}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{company.maxUsers} usuários</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{company.subscriptionPlan}</span>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>Criada em {formatDate(company.createdAt)}</p>
                  {company.subscriptionExpiresAt && (
                    <p>Expira em {formatDate(company.subscriptionExpiresAt)}</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingCompany(company)}
                    className="flex-1"
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={company.active ? "destructive" : "default"}
                    onClick={() => handleToggleStatus(company)}
                  >
                    {company.active ? (
                      <ToggleLeft className="h-3 w-3" />
                    ) : (
                      <ToggleRight className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCompanies.length === 0 && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              {searchTerm ? (
                <>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma empresa encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    Não encontramos empresas que correspondam à sua busca "{searchTerm}".
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm("")}
                  >
                    Limpar filtro
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold mb-2">Nenhuma empresa encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    Comece criando sua primeira empresa no sistema.
                  </p>
                  <CreateCompanyModal onCompanyCreated={loadCompanies} />
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal de Edição */}
        {editingCompany && (
          <EditCompanyModal
            company={editingCompany}
            onSuccess={handleEditSuccess}
            onCancel={() => setEditingCompany(null)}
          />
        )}
      </div>
    </AuthenticatedLayout>
  )
}