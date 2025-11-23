"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, CreditCard, Filter, Receipt, ShoppingBag, AlertCircle } from "lucide-react"
import { CashFlowService, type CashFlowTransaction, type TransactionType } from "@/lib/cash-flow"
import { TransactionForm } from "./transaction-form"
import { EntryForm } from "./entry-form"
import { EditTransactionForm } from "./edit-transaction-form"
import { type DateFilter as DateFilterType } from "./date-filter"
import { DatePeriodFilter, type DatePeriodFilter as PeriodFilterType } from "@/components/ui/date-period-filter"
import { OpenOrder } from "@/lib/open-orders"
import { useAuth } from "@/hooks/use-auth"
import { useOpenOrdersCount } from "@/hooks/use-open-orders"
import { OpenOrdersManager } from "./open-orders-manager"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TransactionListProps {
  type: TransactionType
}

// Helper function to get today's date in Brazil timezone
function getTodayBrazil(): string {
  const now = new Date()
  const brazilDate = new Date(now.toLocaleString('en-US', {
    timeZone: 'America/Sao_Paulo'
  }))
  const year = brazilDate.getFullYear()
  const month = String(brazilDate.getMonth() + 1).padStart(2, '0')
  const day = String(brazilDate.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function TransactionList({ type }: TransactionListProps) {
  const [transactions, setTransactions] = useState<CashFlowTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<CashFlowTransaction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<CashFlowTransaction | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OpenOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodFilter, setPeriodFilter] = useState<PeriodFilterType>({ period: "today", startDate: "", endDate: "" })
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const { authState } = useAuth()
  const { count: openOrdersCount } = useOpenOrdersCount()
  const initialFilterSet = useRef(false)

  // Set initial filter on mount (client-side only)
  useEffect(() => {
    if (!initialFilterSet.current) {
      initialFilterSet.current = true
      const today = getTodayBrazil()
      setPeriodFilter({ period: "today", startDate: today, endDate: today })
    }
  }, [])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await CashFlowService.getTransactions(type)
      setTransactions(data)
    } catch (error) {
      console.error("Erro ao carregar transações:", error)
    } finally {
      setLoading(false)
    }
  }

  const handlePeriodFilterChange = (filter: PeriodFilterType) => {
    setPeriodFilter(filter)
  }

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethodFilter(method)
  }

  useEffect(() => {
    // Don't apply filters until initial filter is set
    if (!periodFilter.startDate || !periodFilter.endDate) {
      return
    }

    let filtered = transactions

    // Filtro de data
    const [startYear, startMonth, startDay] = periodFilter.startDate.split('-').map(Number)
    const [endYear, endMonth, endDay] = periodFilter.endDate.split('-').map(Number)

    const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
    const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999)

    filtered = filtered.filter(transaction => {
      let transactionDate: Date

      if (transaction.date instanceof Date) {
        transactionDate = new Date(
          transaction.date.getFullYear(),
          transaction.date.getMonth(),
          transaction.date.getDate(),
          0, 0, 0, 0
        )
      } else {
        const dateStr = String(transaction.date).split('T')[0]
        const [year, month, day] = dateStr.split('-').map(Number)
        transactionDate = new Date(year, month - 1, day, 0, 0, 0, 0)
      }

      return transactionDate >= startDate && transactionDate <= endDate
    })

    // Filtro de forma de pagamento
    if (paymentMethodFilter !== "all") {
      filtered = filtered.filter(transaction =>
        transaction.paymentMethod === paymentMethodFilter
      )
    }

    // Filtro de categoria
    if (categoryFilter !== "all") {
      filtered = filtered.filter(transaction =>
        transaction.category === categoryFilter
      )
    }

    setFilteredTransactions(filtered)
  }, [transactions, periodFilter, paymentMethodFilter, categoryFilter])

  useEffect(() => {
    loadTransactions()
  }, [type])

  const handleSuccess = () => {
    loadTransactions()
    setShowForm(false)
    setEditingTransaction(null)
    setSelectedOrder(null)
  }

  const handleSelectOrder = (order: OpenOrder) => {
    setSelectedOrder(order)
    setShowForm(true)
  }

  const handleBackToOrders = () => {
    setSelectedOrder(null)
    setShowForm(false)
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

  const canEditOwn = (transaction: CashFlowTransaction) => {
    if (!authState.user) return false
    const role = authState.user.role
    const isOwner = transaction.createdBy === authState.user.name ||
                   transaction.createdBy === authState.user.id

    if (role === 'master' || role === 'administrator') return true
    if (role === 'operational' && isOwner) return true

    return false
  }

  const handleDelete = async (transaction: CashFlowTransaction) => {
    if (!canDelete()) {
      alert("Você não tem permissão para excluir transações.")
      return
    }

    const confirmMessage = `Tem certeza que deseja excluir esta ${type === "entry" ? "entrada" : "saída"}?\n\n` +
      `Descrição: ${transaction.description}\n` +
      `Valor: R$ ${transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`

    if (confirm(confirmMessage)) {
      try {
        const success = await CashFlowService.deleteTransaction(transaction.id)
        if (success) {
          loadTransactions()
        } else {
          alert("Erro ao excluir transação. Tente novamente.")
        }
      } catch (error) {
        console.error("Erro ao excluir:", error)
        alert("Erro ao excluir transação. Tente novamente.")
      }
    }
  }

  const handleEdit = (transaction: CashFlowTransaction) => {
    if (!canEditOwn(transaction)) {
      alert("Você não tem permissão para editar esta transação.")
      return
    }
    setEditingTransaction(transaction)
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

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      vendas: "bg-green-100 text-green-800",
      servicos: "bg-blue-100 text-blue-800",
      investimentos: "bg-purple-100 text-purple-800",
      emprestimos: "bg-orange-100 text-orange-800",
      fornecedores: "bg-red-100 text-red-800",
      salarios: "bg-yellow-100 text-yellow-800",
      aluguel: "bg-gray-100 text-gray-800",
      impostos: "bg-pink-100 text-pink-800",
      marketing: "bg-indigo-100 text-indigo-800",
      outros: "bg-slate-100 text-slate-800",
      compras: "bg-slate-100 text-slate-800",
    }
    return colors[category] || "bg-gray-100 text-gray-800"
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      vendas: "Vendas",
      servicos: "Serviços",
      investimentos: "Investimentos",
      emprestimos: "Empréstimos",
      fornecedores: "Fornecedores",
      salarios: "Salários",
      aluguel: "Aluguel",
      impostos: "Impostos",
      marketing: "Marketing",
      outros: "Outros",
    }
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1)
  }

  // ✅ MODIFICADO: Calcular total usando amount_received
  const getTotalAmount = () => {
    return filteredTransactions.reduce((total, transaction) => {
      // Para vendas a prazo, somar apenas o valor recebido
      const amountToSum = transaction.amountReceived !== undefined
        ? transaction.amountReceived
        : transaction.amount
      return total + amountToSum
    }, 0)
  }

  const getTransactionCount = () => {
    return filteredTransactions.length
  }

  // Calcular valor total de vendas a prazo (ainda não recebido)
  const getInstallmentSalesAmount = () => {
    return filteredTransactions.reduce((total, transaction) => {
      if (transaction.paymentMethod === 'a_prazo') {
        const pendingAmount = transaction.amount - (transaction.amountReceived || 0)
        return total + pendingAmount
      }
      return total
    }, 0)
  }

  // Componente reutilizável para a lista de transações
  const TransactionsList = () => (
    <>
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
                  onFilterChange={handlePeriodFilterChange}
                  currentFilter={periodFilter}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Select value={paymentMethodFilter} onValueChange={handlePaymentMethodChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Forma de Pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Formas</SelectItem>
                    {CashFlowService.getPaymentMethodOptions().map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {type === "exit" && (
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Categorias</SelectItem>
                      {CashFlowService.getCategoryOptions(type).map((category) => (
                        <SelectItem key={category} value={category}>
                          {getCategoryLabel(category)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Indicadores</h3>
        <div className={`grid gap-4 ${type === "entry" ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
          <Card>
            <CardContent className="p-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Total do período</p>
                <p className="text-sm text-muted-foreground mb-2">
                  <span className="font-medium">{getTransactionCount()}</span> {type === "entry" ? "entrada(s)" : "saída(s)"}
                </p>
                <p className={`text-xl font-bold ${type === "entry" ? "text-green-600" : "text-red-600"}`}>
                  {type === "entry" ? "+" : "-"} {formatCurrency(getTotalAmount())}
                </p>
              </div>
            </CardContent>
          </Card>

          {type === "entry" && (
            <Card>
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Vendas a Prazo</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    Valor pendente de recebimento
                  </p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(getInstallmentSalesAmount())}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando transações...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    {transactions.length === 0
                      ? `Nenhuma ${type === "entry" ? "entrada" : "saída"} encontrada`
                      : `Nenhuma ${type === "entry" ? "entrada" : "saída"} encontrada no período selecionado`
                    }
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar {type === "entry" ? "venda" : "saída"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredTransactions.map((transaction) => (
              <Card key={transaction.id}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-semibold text-sm md:text-base">{transaction.description}</h3>
                        <Badge className={`${getCategoryColor(transaction.category)} text-xs`}>
                          {transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                        </Badge>
                        {transaction.paymentMethod && (
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <CreditCard className="h-3 w-3" />
                            {CashFlowService.formatPaymentMethod(transaction.paymentMethod)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                        <span>Data: {formatDate(transaction.date)}</span>
                        <span className="truncate">Por: {transaction.createdBy}</span>
                      </div>
                      {transaction.notes && <p className="text-xs md:text-sm text-muted-foreground mt-2">{transaction.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                      <div className="text-left sm:text-right flex-1 sm:flex-auto">
                        <p className={`text-base md:text-lg font-bold ${type === "entry" ? "text-green-600" : "text-red-600"}`}>
                          {type === "entry" ? "+" : "-"} {formatCurrency(transaction.amountReceived !== undefined ? transaction.amountReceived : transaction.amount)}
                        </p>
                        {transaction.paymentMethod === 'a_prazo' && transaction.amountReceived === 0 && (
                          <Badge variant="outline" className="mt-1 text-orange-600 border-orange-600 text-xs">
                            Total: {formatCurrency(transaction.amount)}
                          </Badge>
                        )}
                      </div>
                      {(canEditOwn(transaction) || canDelete()) && (
                        <div className="flex gap-2">
                          {canEditOwn(transaction) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(transaction)}
                              title="Editar transação"
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(transaction)}
                              title="Excluir transação"
                              className="hover:bg-red-50 hover:text-red-600 h-8 w-8 p-0"
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
    </>
  )

  if (editingTransaction) {
    return (
      <EditTransactionForm
        transaction={editingTransaction}
        onSuccess={handleSuccess}
        onCancel={() => setEditingTransaction(null)}
      />
    )
  }

  if (showForm) {
    if (type === "entry") {
      return (
        <EntryForm
          onSuccess={handleSuccess}
          onCancel={() => {
            setShowForm(false)
            setSelectedOrder(null)
          }}
          selectedOrder={selectedOrder}
          onBackToOrders={handleBackToOrders}
        />
      )
    } else {
      return <TransactionForm type={type} onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
    }
  }

  // Para tipo "entry", usar tabs; para "exit", usar interface simples
  if (type === "entry") {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-600 flex-shrink-0" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Entradas</h1>
            <p className="text-xs md:Gerencie as vendas e comandas do estabelecimentotext-sm text-muted-foreground">
              
            </p>
          </div>
        </div>

        <Tabs defaultValue="sales" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Registrar Vendas
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2 relative">
              <Receipt className="h-4 w-4" />
              Comandas
              {openOrdersCount > 0 && (
                <Badge
                  variant="destructive"
                  className="ml-1 h-5 px-1.5 text-xs font-semibold animate-pulse"
                >
                  {openOrdersCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto text-sm md:text-base">
                <Plus className="h-4 w-4 mr-2" />
                Nova Venda
              </Button>
            </div>
            <TransactionsList />
          </TabsContent>

          <TabsContent value="orders" className="space-y-4 mt-4">
            <OpenOrdersManager onSelectOrder={handleSelectOrder} />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // Interface para saídas (sem tabs)
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-red-600 flex-shrink-0" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Saídas</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Gerencie as saídas do fluxo de caixa
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto text-sm md:text-base">
          <Plus className="h-4 w-4 mr-2" />
          Nova Saída
        </Button>
      </div>

      <TransactionsList />
    </div>
  )
}
