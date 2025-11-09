"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, CreditCard, CheckCircle, Filter, CalendarIcon } from "lucide-react"
import { AccountsPayableService, type AccountPayable } from "@/lib/accounts-payable"
import { AccountForm } from "@/components/accounts-payable/account-form"
import { PaymentModal } from "@/components/accounts-payable/payment-modal"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { DatePeriodFilter, type DatePeriodFilter as DateFilterType } from "@/components/ui/date-period-filter"

export default function AccountsPayablePage() {
  const [accounts, setAccounts] = useState<AccountPayable[]>([])
  const [filteredAccounts, setFilteredAccounts] = useState<AccountPayable[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<AccountPayable | null>(null)
  const [paymentAccount, setPaymentAccount] = useState<AccountPayable | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilterType>({ period: "all" })
  const [statusFilter, setStatusFilter] = useState<string>("pending")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const { authState } = useAuth()

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await AccountsPayableService.getAccountsPayable()
      setAccounts(data)
    } catch (error) {

    } finally {
      setLoading(false)
    }
  }

  const handleDateFilterChange = (filter: DateFilterType) => {
    setDateFilter(filter)
  }

  useEffect(() => {
    let filtered = accounts

    // Filtro de data
    if (dateFilter.startDate && dateFilter.endDate) {
      const startDate = new Date(dateFilter.startDate)
      const endDate = new Date(dateFilter.endDate)

      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)

      filtered = filtered.filter(account => {
        const dueDate = new Date(account.dueDate)
        return dueDate >= startDate && dueDate <= endDate
      })
    }

    // Filtro de status
    if (statusFilter !== "all") {
      if (statusFilter === "pending") {
        filtered = filtered.filter(account => account.status === "pending" || account.status === "overdue")
      } else if (statusFilter === "paid") {
        filtered = filtered.filter(account => account.status === "paid" || account.status === "partially_paid")
      }
    }

    // Filtro de prioridade
    if (priorityFilter !== "all") {
      filtered = filtered.filter(account => account.priority === priorityFilter)
    }

    setFilteredAccounts(filtered)
  }, [accounts, dateFilter, statusFilter, priorityFilter])

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleSuccess = () => {
    loadAccounts()
    setShowForm(false)
    setEditingAccount(null)
    setPaymentAccount(null)
  }

  const canEdit = () => {
    if (!authState.user) return false
    const role = authState.user.role
    return role === 'master' || role === 'administrator'
  }

  const canDelete = () => {
    if (!authState.user) return false
    const role = authState.user.role
    return role === 'master' || role === 'administrator'
  }

  const canView = () => {
    if (!authState.user) return false
    const role = authState.user.role
    return role === 'master' || role === 'administrator'
  }

  const handleDelete = async (account: AccountPayable) => {
    if (!canDelete()) {
      alert("Você não tem permissão para excluir contas.")
      return
    }

    const confirmMessage = `Tem certeza que deseja excluir esta conta?\n\n` +
      `Fornecedor: ${account.vendorName}\n` +
      `Descrição: ${account.description}\n` +
      `Valor: R$ ${account.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

    if (confirm(confirmMessage)) {
      try {
        const success = await AccountsPayableService.deleteAccount(account.id)
        if (success) {
          loadAccounts()
        } else {
          alert("Erro ao excluir conta. Tente novamente.")
        }
      } catch (error) {
        alert("Erro ao excluir conta. Tente novamente.")
      }
    }
  }

  const handleEdit = (account: AccountPayable) => {
    if (!canEdit()) {
      alert("Você não tem permissão para editar contas.")
      return
    }
    setEditingAccount(account)
  }

  const handleMarkAsPaid = (account: AccountPayable) => {
    if (!canEdit()) {
      alert("Você não tem permissão para marcar contas como pagas.")
      return
    }
    setPaymentAccount(account)
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

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      pix: "PIX",
      ted: "TED/DOC",
      boleto: "Boleto",
      cartao_credito: "Cartão de Crédito",
      cartao_debito: "Cartão de Débito",
      dinheiro: "Dinheiro",
      cheque: "Cheque",
      outros: "Outros",
    }
    return methods[method] || method
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
      partially_paid: "bg-blue-100 text-blue-800",
    }
    return colors[status] || "bg-gray-100 text-gray-800"
  }

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: "Pendente",
      paid: "Pago",
      overdue: "Vencido",
      cancelled: "Cancelado",
      partially_paid: "Pago Parcialmente",
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

  const getTotalAmount = () => {
    return filteredAccounts.reduce((total, account) => total + account.amount, 0)
  }

  const getAccountCount = () => {
    return filteredAccounts.length
  }

  const getPriorityIndicators = () => {
    const indicators = {
      low: { count: 0, amount: 0 },
      medium: { count: 0, amount: 0 },
      high: { count: 0, amount: 0 },
      urgent: { count: 0, amount: 0 },
    }

    filteredAccounts.forEach(account => {
      if (account.status !== "paid" && account.status !== "cancelled") {
        const priority = account.priority as keyof typeof indicators
        if (indicators[priority]) {
          indicators[priority].count++
          indicators[priority].amount += account.amount
        }
      }
    })

    return indicators
  }

  if (!canView()) {
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

  if (editingAccount) {
    return (
      <AuthenticatedLayout>
        <AccountForm 
          account={editingAccount}
          onSuccess={handleSuccess} 
          onCancel={() => setEditingAccount(null)} 
        />
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

        <Card>
          <CardContent className="pt-4 md:pt-6">
            <div className="flex flex-col gap-3 md:gap-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                <span className="text-sm md:text-base font-medium">Filtros:</span>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Período:</span>
                  <DatePeriodFilter
                    onFilterChange={handleDateFilterChange}
                    currentFilter={dateFilter}
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    className="px-3 py-1.5 border rounded-md text-sm min-w-[140px]"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Todos Status</option>
                    <option value="pending">Pendentes</option>
                    <option value="paid">Pagos</option>
                  </select>
                  <select
                    className="px-3 py-1.5 border rounded-md text-sm min-w-[140px]"
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                  >
                    <option value="all">Todas Prioridades</option>
                    <option value="urgent">Urgente</option>
                    <option value="high">Alta</option>
                    <option value="medium">Média</option>
                    <option value="low">Baixa</option>
                  </select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Indicadores</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground mb-1">Total do período</p>
                <p className="text-sm text-muted-foreground mb-2">
                  <span className="font-medium">{getAccountCount()}</span> conta(s) a pagar
                </p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(getTotalAmount())}
                </p>
              </CardContent>
            </Card>
            {(() => {
              const indicators = getPriorityIndicators()
              return (
                <>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-purple-100 text-purple-800 text-xs">Urgente</Badge>
                        <span className="text-xs font-medium">{indicators.urgent.count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency(indicators.urgent.amount)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-red-100 text-red-800 text-xs">Alta</Badge>
                        <span className="text-xs font-medium">{indicators.high.count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
                      <p className="text-lg font-bold text-red-600">
                        {formatCurrency(indicators.high.amount)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-orange-100 text-orange-800 text-xs">Média</Badge>
                        <span className="text-xs font-medium">{indicators.medium.count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
                      <p className="text-lg font-bold text-orange-600">
                        {formatCurrency(indicators.medium.amount)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-blue-100 text-blue-800 text-xs">Baixa</Badge>
                        <span className="text-xs font-medium">{indicators.low.count}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
                      <p className="text-lg font-bold text-blue-600">
                        {formatCurrency(indicators.low.amount)}
                      </p>
                    </CardContent>
                  </Card>
                </>
              )
            })()}
          </div>
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
                          <h3 className="font-semibold">{account.vendorName}</h3>
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
                        {account.paidDate && (
                          <div className="flex items-center gap-2 text-sm text-green-600 font-medium mt-2">
                            <CheckCircle className="h-4 w-4" />
                            <span>Pago em: {formatDate(account.paidDate)}</span>
                            {account.paymentMethod && (
                              <>
                                <span className="text-muted-foreground">•</span>
                                <span>Método: {formatPaymentMethod(account.paymentMethod)}</span>
                              </>
                            )}
                          </div>
                        )}
                        {account.notes && <p className="text-sm text-muted-foreground mt-2">{account.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(account.amount)}
                          </p>
                        </div>
                        {(canEdit() || canDelete()) && (
                          <div className="flex gap-2">
                            {canEdit() && account.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleMarkAsPaid(account)}
                                title="Marcar como pago"
                                className="hover:bg-green-50 hover:text-green-600"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {canEdit() && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleEdit(account)}
                                title="Editar conta"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete() && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleDelete(account)}
                                title="Excluir conta"
                                className="hover:bg-red-50 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
      {paymentAccount && (
        <PaymentModal
          account={paymentAccount}
          onSuccess={handleSuccess}
          onCancel={() => setPaymentAccount(null)}
        />
      )}
    </AuthenticatedLayout>
  )
}