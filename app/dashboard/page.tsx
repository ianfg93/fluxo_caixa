"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { MetricsCards } from "@/components/dashboard/metrics-cards"
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart"
import { CategoryChart } from "@/components/dashboard/category-chart"
import { AlertsPanel } from "@/components/dashboard/alerts-panel"
import { ReportsService } from "@/lib/reports"
import { CashFlowService } from "@/lib/cash-flow"
import { useAuth } from "@/hooks/use-auth"
import { TrendingUp, TrendingDown } from "lucide-react"
import { CreateCompanyModal } from "@/components/companies/create-company-modal"

export default function DashboardPage() {
  const { authState } = useAuth()
  const [metrics, setMetrics] = useState<any>(null)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [entryCategories, setEntryCategories] = useState<any[]>([])
  const [exitCategories, setExitCategories] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>("")

  const isMaster = authState.user?.role === 'master'
  const isAdmin = authState.user?.role === 'administrator' || isMaster

  useEffect(() => {
    if (isMaster) {
      loadAvailableCompanies()
    }
    loadDashboardData()
  }, [selectedCompany])

  async function loadAvailableCompanies() {
    try {
      setAvailableCompanies([
        { id: 'all', name: 'Todas as Empresas' },
        { id: 'empresa-exemplo', name: 'Empresa Exemplo Ltda' }
      ])
    } catch (error) {
      
    }
  }

  async function loadDashboardData() {
  try {
    setLoading(true)

    const companyFilter = isMaster && selectedCompany && selectedCompany !== 'all' ? selectedCompany : undefined

    const [dashboardMetrics, monthlyReport, entryCategoryData, exitCategoryData, transactions] = await Promise.all([
      ReportsService.getDashboardMetrics(companyFilter),
      ReportsService.getMonthlyData(companyFilter),
      ReportsService.getCategoryBreakdown("entry", companyFilter),
      ReportsService.getCategoryBreakdown("exit", companyFilter),
      CashFlowService.getTransactions(undefined, companyFilter),
    ])

    setMetrics(dashboardMetrics)
    setMonthlyData(monthlyReport)
    setEntryCategories(entryCategoryData)
    setExitCategories(exitCategoryData)
    setRecentTransactions(transactions.slice(0, 5))
  } catch (error) {
    
  } finally {
    setLoading(false)
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral completa do fluxo de caixa
            {selectedCompany && selectedCompany !== 'all' && ` - ${availableCompanies.find(c => c.id === selectedCompany)?.name}`}
          </p>
        </div>
      </div>

      {!metrics ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground">Erro ao carregar dados do dashboard</p>
          </div>
        </div>
      ) : (
        <>
          <MetricsCards metrics={metrics} />

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              {/* <TabsTrigger value="cash-flow">Fluxo de Caixa</TabsTrigger>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="alerts">Alertas</TabsTrigger> */}
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <CashFlowChart data={monthlyData} />
                <AlertsPanel />
              </div>

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

          </Tabs>
        </>
      )}
    </div>
  )
}