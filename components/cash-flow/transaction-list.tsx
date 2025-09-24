"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import { CashFlowService, type CashFlowTransaction, type TransactionType } from "@/lib/cash-flow"
import { TransactionForm } from "./transaction-form"
import { EntryForm } from "./entry-form"
import { EditTransactionForm } from "./edit-transaction-form"
import { useAuth } from "@/hooks/use-auth"

interface TransactionListProps {
  type: TransactionType
}

export function TransactionList({ type }: TransactionListProps) {
  const [transactions, setTransactions] = useState<CashFlowTransaction[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<CashFlowTransaction | null>(null)
  const [loading, setLoading] = useState(true)
  const { hasPermission, authState } = useAuth()

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

  useEffect(() => {
    loadTransactions()
  }, [type])

  const handleSuccess = () => {
    loadTransactions()
    setShowForm(false)
    setEditingTransaction(null)
  }

  const handleDelete = async (transaction: CashFlowTransaction) => {
    // Verificar permissão
    if (!hasPermission("manager")) {
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
    // Verificar permissão
    if (!hasPermission("manager")) {
      alert("Você não tem permissão para editar transações.")
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

  // Debug: verificar se o usuário está logado
  console.log('AuthState:', authState)
  console.log('Tem permissão para manager:', hasPermission("manager"))

  // Mostrar formulário de edição
  if (editingTransaction) {
    return (
      <EditTransactionForm 
        transaction={editingTransaction}
        onSuccess={handleSuccess}
        onCancel={() => setEditingTransaction(null)}
      />
    )
  }

  // Mostrar formulário de nova transação
  if (showForm) {
    if (type === "entry") {
      return <EntryForm onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
    } else {
      return <TransactionForm type={type} onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {type === "entry" ? (
            <TrendingUp className="h-6 w-6 text-green-600" />
          ) : (
            <TrendingDown className="h-6 w-6 text-red-600" />
          )}
          <div>
            <h1 className="text-2xl font-bold">{type === "entry" ? "Entradas" : "Saídas"}</h1>
            <p className="text-muted-foreground">
              Gerencie as {type === "entry" ? "entradas" : "saídas"} do fluxo de caixa
            </p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova {type === "entry" ? "Venda" : "Saída"}
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando transações...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {transactions.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">
                    Nenhuma {type === "entry" ? "entrada" : "saída"} encontrada
                  </p>
                  <Button onClick={() => setShowForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar primeira {type === "entry" ? "venda" : "saída"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            transactions.map((transaction) => (
              <Card key={transaction.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{transaction.description}</h3>
                        <Badge className={getCategoryColor(transaction.category)}>
                          {transaction.category.charAt(0).toUpperCase() + transaction.category.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Data: {formatDate(transaction.date)}</span>
                        <span>Por: {transaction.createdBy}</span>
                      </div>
                      {transaction.notes && <p className="text-sm text-muted-foreground mt-2">{transaction.notes}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${type === "entry" ? "text-green-600" : "text-red-600"}`}>
                          {type === "entry" ? "+" : "-"} {formatCurrency(transaction.amount)}
                        </p>
                      </div>
                      {hasPermission("manager") && (
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEdit(transaction)}
                            title="Editar transação"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDelete(transaction)}
                            title="Excluir transação"
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
  )
}