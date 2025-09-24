"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, DollarSign, CreditCard } from "lucide-react"
import { AccountsPayableService, type AccountPayable, type PaymentStatus } from "@/lib/accounts-payable"
import { AccountForm } from "./account-form"
import { PaymentModal } from "./payment-modal"
import { useAuth } from "@/hooks/use-auth"

export function AccountsList() {
  const [accounts, setAccounts] = useState<AccountPayable[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<AccountPayable | null>(null)
  const [activeTab, setActiveTab] = useState<PaymentStatus | "all">("all")
  const { hasPermission } = useAuth()

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const data = await AccountsPayableService.getAccountsPayable()
      // Update overdue status
      const updatedData = data.map((account) => {
        if (account.status === "pending" && new Date(account.dueDate) < new Date()) {
          return { ...account, status: "overdue" as PaymentStatus }
        }
        return account
      })
      setAccounts(updatedData)
    } catch (error) {
      console.error("Erro ao carregar contas:", error)
      setAccounts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAccounts()
  }, [])

  const handleSuccess = () => {
    loadAccounts()
    setShowForm(false)
    setSelectedAccount(null)
  }

  const handlePayment = (account: AccountPayable) => {
    setSelectedAccount(account)
  }

  const filteredAccounts =
    activeTab === "all"
      ? accounts
      : accounts.filter((account) => {
          if (activeTab === "overdue") {
            return account.status === "pending" && new Date(account.dueDate) < new Date()
          }
          return account.status === activeTab
        })

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR")
  }

  const getStatusColor = (status: PaymentStatus, dueDate: Date) => {
    if (status === "pending" && new Date(dueDate) < new Date()) {
      return "bg-red-100 text-red-800"
    }

    const colors: Record<PaymentStatus, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      paid: "bg-green-100 text-green-800",
      overdue: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    }
    return colors[status]
  }

  const getStatusLabel = (status: PaymentStatus, dueDate: Date) => {
    if (status === "pending" && new Date(dueDate) < new Date()) {
      return "Em Atraso"
    }

    const labels: Record<PaymentStatus, string> = {
      pending: "Pendente",
      paid: "Pago",
      overdue: "Em Atraso",
      cancelled: "Cancelado",
    }
    return labels[status]
  }

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    }
    return colors[priority] || "bg-gray-100 text-gray-800"
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: "Baixa",
      medium: "Média",
      high: "Alta",
      urgent: "Urgente",
    }
    return labels[priority] || priority
  }

  if (showForm) {
    return <AccountForm onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Contas a Pagar</h1>
            <p className="text-muted-foreground">Gerencie as contas a pagar da empresa</p>
          </div>
        </div>
        {hasPermission("manager") && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PaymentStatus | "all")}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Pendentes</TabsTrigger>
          <TabsTrigger value="overdue">Em Atraso</TabsTrigger>
          <TabsTrigger value="paid">Pagas</TabsTrigger>
          <TabsTrigger value="cancelled">Canceladas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Carregando contas...</p>
              </CardContent>
            </Card>
          ) : filteredAccounts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">Nenhuma conta encontrada</p>
                  {hasPermission("manager") && (
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar primeira conta
                    </Button>
                  )}
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
                        <h3 className="font-semibold">{account.description}</h3>
                        <Badge className={getStatusColor(account.status, account.dueDate)}>
                          {getStatusLabel(account.status, account.dueDate)}
                        </Badge>
                        <Badge className={getPriorityColor(account.priority)}>
                          {getPriorityLabel(account.priority)}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          <strong>Fornecedor:</strong> {account.supplierName}
                        </p>
                        <p>
                          <strong>Categoria:</strong> {account.category}
                        </p>
                        <div className="flex items-center gap-4">
                          <span>
                            <strong>Vencimento:</strong> {formatDate(account.dueDate)}
                          </span>
                          {account.invoiceNumber && (
                            <span>
                              <strong>NF:</strong> {account.invoiceNumber}
                            </span>
                          )}
                        </div>
                        {account.notes && <p className="text-xs mt-2">{account.notes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-red-600">{formatCurrency(account.amount)}</p>
                        {account.status === "paid" && account.paidDate && (
                          <p className="text-xs text-green-600">Pago em {formatDate(account.paidDate)}</p>
                        )}
                      </div>
                      {hasPermission("manager") && account.status === "pending" && (
                        <Button size="sm" onClick={() => handlePayment(account)}>
                          <DollarSign className="h-4 w-4 mr-1" />
                          Pagar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {selectedAccount && (
        <PaymentModal account={selectedAccount} onSuccess={handleSuccess} onCancel={() => setSelectedAccount(null)} />
      )}
    </div>
  )
}