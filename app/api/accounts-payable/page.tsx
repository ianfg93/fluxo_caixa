"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, CreditCard, DollarSign } from "lucide-react"
import { AccountsPayableService, type AccountPayable } from "@/lib/accounts-payable"
import { AccountForm } from "@/components/accounts-payable/account-form"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { DateFilter, type DateFilter as DateFilterType } from "@/components/cash-flow/date-filter"

export default function AccountsPayablePage() {
  const [accounts, setAccounts] = useState<AccountPayable[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<AccountPayable[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilterType>({ period: "today" })
  const { hasPermission } = useAuth()

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await AccountsPayableService.getAccountsPayable()
      setAccounts(data)
    } catch (error) {
      console.error("Erro ao carregar contas a pagar:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrar contas quando os dados ou filtro mudam
  useEffect(() => {
    let filtered = accounts

    if (dateFilter.startDate && dateFilter.endDate) {
      const startDate = new Date(dateFilter.startDate)
      const endDate = new Date(dateFilter.endDate)
      
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)

      filtered = accounts.filter(account => {
        const dueDate = new Date(account.dueDate)
        return dueDate >= startDate && dueDate <= endDate
      })
    }

    setFilteredAccounts(filtered)
  }, [accounts, dateFilter])

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleSuccess = () => {
    loadAccounts()
    setShowForm(false)
  }

  const handleDelete = async (account: AccountPayable) => {
    if (!hasPermission("manager")) {
      alert("Você não tem permissão para excluir contas.")
      return
    }

    const confirmMessage = `Tem certeza que deseja excluir esta conta?\n\n` +
      `Fornecedor: ${account.supplierName}\n` +
      `Descrição: ${account.description}\n` +
      `Valor: R$ ${account.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

    if (confirm(confirmMessage)) {
      try {
        // Implementar método de exclusão se necessário
        console.log("Excluir conta:", account.id)
        loadAccounts()
      } catch (error) {
        console.error("Erro ao excluir:", error)
        alert("Erro ao excluir conta. Tente novamente.")
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR")
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: "Pendente",
      paid: "Pago",
      overdue: "Vencido",
      cancelled: "Cancelado",
    }
    return texts[status] || status
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-orange-100 text-orange-800",
      high: "bg-red-100 text-red-800",
      urgent: "bg-purple-100 text-purple-800",
    }
    return colors[priority] || "bg-gray-100 text-gray-800"
  }

  const getPriorityText = (priority: string) => {
    const texts: Record<string, string> = {
      low: "Baixa",
      medium: "Média",
      high: "Alta",
      urgent: "Urgente",
    }
    return texts[priority] || priority
  }

  // Calcular totais do período filtrado
  const getTotalAmount = () => {
    return filteredAccounts.reduce((total, account) => total + account.amount, 0)
  }

  const getAccountCount = () => {
    return filteredAccounts.length
  }

  if (!hasPermission("manager")) {
    return (
      <AuthenticatedLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para acessar contas a pagar.
            </p>
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    )
  }

  if (showForm) {
    return (
      <AuthenticatedLayout>
        <AccountForm onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold">Contas a Pagar</h1>
              <p className="text-muted-foreground">
                Gerencie suas obrigações financeiras
              </p>
            </div>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {/* Filtros de Data e Resumo lado a lado */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 lg:flex-[2]">
            <DateFilter 
              onFilterChange={setDateFilter}
              currentFilter={dateFilter}
            />
          </div>

          {getAccountCount() > 0 && (
            <div className="lg:flex-[1]">
              <Card className="min-h-[140px]">
                <CardContent className="p-4 h-full flex flex-col justify-center">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">
                      <span className="font-medium">{getAccountCount()}</span> conta(s) a pagar
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">Total do período</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(getTotalAmount())}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Carregando contas...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredAccounts.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      {accounts.length === 0 
                        ? "Nenhuma conta a pagar encontrada"
                        : "Nenhuma conta encontrada no período selecionado"
                      }
                    </p>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar primeira conta
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              filteredAccounts.map((account) => (
                <Card key={account.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold">{account.supplierName}</h3>
                          <Badge className={getStatusColor(account.status)}>
                            {getStatusText(account.status)}
                          </Badge>
                          <Badge className={getPriorityColor(account.priority)}>
                            {getPriorityText(account.priority)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{account.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Vencimento: {formatDate(account.dueDate)}</span>
                          <span>Categoria: {account.category}</span>
                          {account.invoiceNumber && <span>NF: {account.invoiceNumber}</span>}
                        </div>
                        {account.notes && <p className="text-sm text-muted-foreground mt-2">{account.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(account.amount)}
                          </p>
                        </div>
                        {hasPermission("manager") && (
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              title="Editar conta"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handleDelete(account)}
                              title="Excluir conta"
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}