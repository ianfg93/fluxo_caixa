"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, DollarSign, TrendingDown, TrendingUp, Calendar, Filter, Edit, CreditCard } from "lucide-react"
import { CustomerService, type Customer, type CustomerTransaction } from "@/lib/customers"
import { CustomerForm } from "./customer-form"
import { CashFlowService } from "@/lib/cash-flow"
import { PaymentForm } from "./payment-form"

interface CustomerDetailProps {
  customer: Customer
  onBack: () => void
  onUpdate: () => void
}

type FilterStatus = "all" | "pending" | "paid"

export function CustomerDetail({ customer, onBack, onUpdate }: CustomerDetailProps) {
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<CustomerTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [filterMonth, setFilterMonth] = useState<string>("all")
  const [customerData, setCustomerData] = useState<Customer>(customer)

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await CustomerService.getCustomerTransactions(customer.id)
      setTransactions(data)
    } catch (error) {
      console.error("Erro ao carregar transações:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerData = async () => {
    try {
      const data = await CustomerService.getCustomerById(customer.id)
      if (data) {
        setCustomerData(data)
      }
    } catch (error) {
      console.error("Erro ao carregar dados do cliente:", error)
    }
  }

  useEffect(() => {
    loadTransactions()
    loadCustomerData()
  }, [customer.id])

  useEffect(() => {
    let filtered = transactions

    // Filtro por status
    if (filterStatus === "pending") {
      filtered = filtered.filter(t => t.type === 'sale' && t.amountReceived < t.amount)
    } else if (filterStatus === "paid") {
      filtered = filtered.filter(t => t.type === 'payment' || (t.type === 'sale' && t.amountReceived >= t.amount))
    }

    // Filtro por mês
    if (filterMonth !== "all") {
      filtered = filtered.filter(t => {
        const transactionMonth = new Date(t.date).toISOString().slice(0, 7)
        return transactionMonth === filterMonth
      })
    }

    setFilteredTransactions(filtered)
  }, [transactions, filterStatus, filterMonth])

  const handleSuccess = () => {
    loadTransactions()
    loadCustomerData()
    setShowEditForm(false)
    setShowPaymentForm(false)
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

  const getTotalDebt = () => {
    return customerData.balance || 0
    }

  const getTotalPaid = () => {
    return transactions
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0)
  }

  // Gerar opções de meses disponíveis
  const getAvailableMonths = () => {
    const months = new Set<string>()
    transactions.forEach(t => {
      const month = new Date(t.date).toISOString().slice(0, 7)
      months.add(month)
    })
    return Array.from(months).sort().reverse()
  }

  if (showEditForm) {
    return (
      <CustomerForm 
        customer={customerData}
        onSuccess={handleSuccess}
        onCancel={() => setShowEditForm(false)}
      />
    )
  }

  if (showPaymentForm) {
    return (
      <PaymentForm
        customer={customerData}
        onSuccess={handleSuccess}
        onCancel={() => setShowPaymentForm(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{customerData.name}</h1>
            <p className="text-muted-foreground">Histórico de transações e pagamentos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEditForm(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button onClick={() => setShowPaymentForm(true)}>
            <DollarSign className="h-4 w-4 mr-2" />
            Registrar Pagamento
          </Button>
        </div>
      </div>

      {/* Informações do Cliente */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Informações de Contato</h3>
              <div className="space-y-1 text-sm">
                {customerData.cpfCnpj && <p><strong>CPF/CNPJ:</strong> {customerData.cpfCnpj}</p>}
                {customerData.phone && <p><strong>Telefone:</strong> {customerData.phone}</p>}
                {customerData.email && <p><strong>Email:</strong> {customerData.email}</p>}
                {customerData.address && <p><strong>Endereço:</strong> {customerData.address}</p>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Resumo Financeiro</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total em Vendas:</span>
                  <span className="font-semibold text-blue-600">{formatCurrency(customerData.totalDebt || getTotalDebt())}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Pago:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(customerData.totalPaid || getTotalPaid())}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Saldo Atual</h3>
              <div className="text-center p-4 bg-slate-50 rounded-lg">
                <p className={`text-3xl font-bold ${getTotalDebt() > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(getTotalDebt())}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {getTotalDebt() > 0 ? 'Saldo Devedor' : 'Quitado'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Filter className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filterStatus">Filtrar por Status</Label>
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as FilterStatus)}>
                  <SelectTrigger id="filterStatus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="paid">Pagos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filterMonth">Filtrar por Mês</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger id="filterMonth">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os meses</SelectItem>
                    {getAvailableMonths().map(month => {
                      const date = new Date(month + "-01")
                      const monthName = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
                      return (
                        <SelectItem key={month} value={month}>
                          {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Transações */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Histórico de Movimentação</h2>
        {loading ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Carregando histórico...</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredTransactions.length === 0 ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <p className="text-muted-foreground">
                    {transactions.length === 0 
                      ? "Nenhuma transação registrada para este cliente"
                      : "Nenhuma transação encontrada com os filtros selecionados"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredTransactions.map((transaction) => (
                <Card key={transaction.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`p-2 rounded-full ${
                            transaction.type === 'sale' 
                              ? 'bg-orange-100' 
                              : 'bg-green-100'
                          }`}>
                            {transaction.type === 'sale' ? (
                              <TrendingDown className="h-4 w-4 text-orange-600" />
                            ) : (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div>
                            <h3 className="font-semibold">{transaction.description}</h3>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(transaction.date)}
                              </span>
                              {transaction.paymentMethod && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <CreditCard className="h-3 w-3" />
                                    {CashFlowService.formatPaymentMethod(transaction.paymentMethod as any)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {transaction.notes && (
                          <p className="text-sm text-muted-foreground ml-12">{transaction.notes}</p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        {transaction.type === 'sale' ? (
                          <>
                            <p className={`text-lg font-bold ${
                              transaction.amountReceived < transaction.amount 
                                ? 'text-red-600' 
                                : 'text-green-600'
                            }`}>
                              {formatCurrency(transaction.amount)}
                            </p>
                            {transaction.amountReceived < transaction.amount ? (
                              <Badge variant="destructive" className="mt-1">
                                Devendo: {formatCurrency(transaction.amount - transaction.amountReceived)}
                              </Badge>
                            ) : (
                              <Badge className="mt-1 bg-green-600">Quitado</Badge>
                            )}
                          </>
                        ) : (
                          <>
                            <p className="text-lg font-bold text-green-600">
                              + {formatCurrency(transaction.amount)}
                            </p>
                            <Badge variant="outline" className="mt-1">Pagamento</Badge>
                          </>
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
    </div>
  )
}