"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, TrendingUp, TrendingDown, CreditCard, Filter } from "lucide-react"
import { CashFlowService, type CashFlowTransaction, type TransactionType } from "@/lib/cash-flow"
import { TransactionForm } from "./transaction-form"
import { EntryForm } from "./entry-form"
import { EditTransactionForm } from "./edit-transaction-form"
import { type DateFilter as DateFilterType } from "./date-filter"
import { OpenOrder } from "@/lib/open-orders"
import { useAuth } from "@/hooks/use-auth"
import { OpenOrdersManager } from "./open-orders-manager"

interface TransactionListProps {
  type: TransactionType
}

export function TransactionList({ type }: TransactionListProps) {
  const [transactions, setTransactions] = useState<CashFlowTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<CashFlowTransaction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<CashFlowTransaction | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<OpenOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilterType>({ period: "all" })
  const [periodFilter, setPeriodFilter] = useState<string>("all")
  const [customStartDate, setCustomStartDate] = useState<string>("")
  const [customEndDate, setCustomEndDate] = useState<string>("")
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all")
  const { authState } = useAuth()

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

  const handlePeriodChange = (period: string) => {
    setPeriodFilter(period)

    const today = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    const formatDate = (date: Date): string => {
      return date.toISOString().split('T')[0]
    }

    switch (period) {
      case "today":
        startDate = formatDate(today)
        endDate = formatDate(today)
        break

      case "week":
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        startDate = formatDate(weekStart)
        endDate = formatDate(weekEnd)
        break

      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        startDate = formatDate(monthStart)
        endDate = formatDate(monthEnd)
        break

      case "all":
        startDate = undefined
        endDate = undefined
        break

      case "custom":
        return
    }

    setDateFilter({
      period: period as DateFilterType["period"],
      startDate,
      endDate,
      paymentMethod: paymentMethodFilter !== "all" ? paymentMethodFilter as any : undefined
    })
  }

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      setDateFilter({
        period: "custom",
        startDate: customStartDate,
        endDate: customEndDate,
        paymentMethod: paymentMethodFilter !== "all" ? paymentMethodFilter as any : undefined
      })
    }
  }

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethodFilter(method)
    setDateFilter({
      ...dateFilter,
      paymentMethod: method !== "all" ? method as any : undefined
    })
  }

  useEffect(() => {
    let filtered = transactions

    if (dateFilter.startDate && dateFilter.endDate) {
      const startDate = new Date(dateFilter.startDate + 'T00:00:00')
      const endDate = new Date(dateFilter.endDate + 'T23:59:59')

      filtered = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date)
        const transactionDateOnly = new Date(transactionDate.getFullYear(), transactionDate.getMonth(), transactionDate.getDate())
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate())
        
        return transactionDateOnly >= startDateOnly && transactionDateOnly <= endDateOnly
      })
    }

    if (dateFilter.paymentMethod) {
      filtered = filtered.filter(transaction => 
        transaction.paymentMethod === dateFilter.paymentMethod
      )
    }

    setFilteredTransactions(filtered)
  }, [transactions, dateFilter])

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
    }
    return colors[category] || "bg-gray-100 text-gray-800"
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

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {type === "entry" ? (
            <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-green-600 flex-shrink-0" />
          ) : (
            <TrendingDown className="h-5 w-5 md:h-6 md:w-6 text-red-600 flex-shrink-0" />
          )}
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{type === "entry" ? "Entradas" : "Saídas"}</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              Gerencie as {type === "entry" ? "entradas" : "saídas"} do fluxo de caixa
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto text-sm md:text-base">
          <Plus className="h-4 w-4 mr-2" />
          Nova {type === "entry" ? "Venda" : "Saída"}
        </Button>
      </div>

      {/* Sistema de Comandas - Apenas para Entradas */}
      {type === "entry" && (
        <OpenOrdersManager onSelectOrder={handleSelectOrder} />
      )}

      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-sm">Filtros:</span>
            </div>
            <select
              className="px-3 py-1.5 border rounded-md text-sm min-w-[140px]"
              value={periodFilter}
              onChange={(e) => handlePeriodChange(e.target.value)}
            >
              <option value="all">Todos Períodos</option>
              <option value="today">Hoje</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mês</option>
              <option value="custom">Personalizado</option>
            </select>
            {periodFilter === "custom" && (
              <>
                <input
                  type="date"
                  className="px-3 py-1.5 border rounded-md text-sm"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  placeholder="Data inicial"
                />
                <input
                  type="date"
                  className="px-3 py-1.5 border rounded-md text-sm"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  placeholder="Data final"
                />
                <Button
                  size="sm"
                  onClick={handleCustomDateApply}
                  disabled={!customStartDate || !customEndDate}
                >
                  Aplicar
                </Button>
              </>
            )}
            <select
              className="px-3 py-1.5 border rounded-md text-sm min-w-[140px]"
              value={paymentMethodFilter}
              onChange={(e) => handlePaymentMethodChange(e.target.value)}
            >
              <option value="all">Todas Formas</option>
              {CashFlowService.getPaymentMethodOptions().map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Indicadores</h3>
        <div className="grid grid-cols-1 gap-4">
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
                        {/* ✅ MODIFICADO: Exibir valor recebido */}
                        <p className={`text-base md:text-lg font-bold ${type === "entry" ? "text-green-600" : "text-red-600"}`}>
                          {type === "entry" ? "+" : "-"} {formatCurrency(transaction.amountReceived !== undefined ? transaction.amountReceived : transaction.amount)}
                        </p>
                        {/* ✅ NOVO: Badge para vendas a prazo */}
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
    </div>
  )
}