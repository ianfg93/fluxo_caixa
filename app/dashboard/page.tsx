"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MetricsCards } from "@/components/dashboard/metrics-cards"
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart"
import { CategoryChart } from "@/components/dashboard/category-chart"
import { AlertsPanel } from "@/components/dashboard/alerts-panel"
import { ReportsService } from "@/lib/reports"
import { CashFlowService } from "@/lib/cash-flow"
import { TrendingUp, TrendingDown } from "lucide-react"

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [entryCategories, setEntryCategories] = useState<any[]>([])
  const [exitCategories, setExitCategories] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true)

        const [dashboardMetrics, monthlyReport, entryCategoryData, exitCategoryData, transactions] = await Promise.all([
          ReportsService.getDashboardMetrics(),
          ReportsService.getMonthlyData(),
          ReportsService.getCategoryBreakdown("entry"),
          ReportsService.getCategoryBreakdown("exit"),
          CashFlowService.getTransactions(),
        ])

        setMetrics(dashboardMetrics)
        setMonthlyData(monthlyReport)
        setEntryCategories(entryCategoryData)
        setExitCategories(exitCategoryData)
        setRecentTransactions(transactions.slice(0, 5))
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [])

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Erro ao carregar dados do dashboard</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral completa do fluxo de caixa da empresa</p>
      </div>

      {/* Metrics Cards */}
      <MetricsCards metrics={metrics} />

      {/* Charts and Reports */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="cash-flow">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CashFlowChart data={monthlyData} />
            <AlertsPanel />
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Transações Recentes</CardTitle>
              <CardDescription>Últimas movimentações do fluxo de caixa</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma transação encontrada</p>
                ) : (
                  recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {transaction.type === "entry" ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <div>
                          <p className="font-medium">{transaction.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.date)} • {transaction.category}
                          </p>
                        </div>
                      </div>
                      <div className={`font-bold ${transaction.type === "entry" ? "text-green-600" : "text-red-600"}`}>
                        {transaction.type === "entry" ? "+" : "-"} {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash-flow">
          <CashFlowChart data={monthlyData} />
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryChart data={entryCategories} title="Entradas por Categoria" type="entry" />
            <CategoryChart data={exitCategories} title="Saídas por Categoria" type="exit" />
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <AlertsPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}
