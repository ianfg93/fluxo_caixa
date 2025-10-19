"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Calendar, TrendingUp, TrendingDown } from "lucide-react"
import { MetricsCards } from "@/components/dashboard/metrics-cards"
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart"
import { AlertsPanel } from "@/components/dashboard/alerts-panel"
import { ReportsService } from "@/lib/reports"
import { CashFlowService } from "@/lib/cash-flow"
import { useAuth } from "@/hooks/use-auth"

type PeriodFilter = "day" | "month" | "quarter" | "year" | "all"

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
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("day")

  const isMaster = authState.user?.role === 'master'
  const isAdmin = authState.user?.role === 'administrator' || isMaster

  useEffect(() => {
    if (isMaster) {
      loadAvailableCompanies()
    }
    loadDashboardData()
  }, [selectedCompany, selectedPeriod])

  async function loadAvailableCompanies() {
    try {
      setAvailableCompanies([
        { id: 'all', name: 'Todas as Empresas' },
        { id: 'empresa-exemplo', name: 'Empresa Exemplo Ltda' }
      ])
    } catch (error) {
      console.error('Erro ao carregar empresas:', error)
    }
  }

  // Calcular data de início baseado no período selecionado
  function getStartDate(period: PeriodFilter): Date | undefined {
    const now = new Date()
    
    switch (period) {
      case "day":
        // Início do dia atual (00:00:00)
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
      
      case "month":
        // Primeiro dia do mês atual
        return new Date(now.getFullYear(), now.getMonth(), 1)
      
      case "quarter":
        // Primeiro dia do trimestre atual
        const currentQuarter = Math.floor(now.getMonth() / 3)
        return new Date(now.getFullYear(), currentQuarter * 3, 1)
      
      case "year":
        // Primeiro dia do ano atual
        return new Date(now.getFullYear(), 0, 1)
      
      case "all":
        // Sem filtro de data
        return undefined
      
      default:
        return undefined
    }
  }

  // Calcular data de fim para períodos específicos
  function getEndDate(period: PeriodFilter): Date | undefined {
    const now = new Date()
    
    switch (period) {
      case "day":
        // Final do dia atual (23:59:59.999)
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
      
      default:
        // Para outros períodos, não há data de fim específica
        return undefined
    }
  }

  function getPeriodLabel(period: PeriodFilter): string {
    const now = new Date()
    
    switch (period) {
      case "day":
        return now.toLocaleDateString("pt-BR", { 
          weekday: "long", 
          day: "numeric", 
          month: "long", 
          year: "numeric" 
        })
      
      case "month":
        return now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
      
      case "quarter":
        const quarter = Math.floor(now.getMonth() / 3) + 1
        return `${quarter}º Trimestre de ${now.getFullYear()}`
      
      case "year":
        return now.getFullYear().toString()
      
      case "all":
        return "Todo o período"
      
      default:
        return ""
    }
  }

  async function loadDashboardData() {
    try {
      setLoading(true)

      const companyFilter = isMaster && selectedCompany && selectedCompany !== 'all' ? selectedCompany : undefined
      const startDate = getStartDate(selectedPeriod)
      const endDate = getEndDate(selectedPeriod)

      const [dashboardMetrics, monthlyReport, entryCategoryData, exitCategoryData, transactions] = await Promise.all([
        ReportsService.getDashboardMetrics(companyFilter, startDate, endDate),
        ReportsService.getMonthlyData(companyFilter, startDate, endDate),
        ReportsService.getCategoryBreakdown("entry", companyFilter, startDate, endDate),
        ReportsService.getCategoryBreakdown("exit", companyFilter, startDate, endDate),
        CashFlowService.getTransactions(undefined, companyFilter),
      ])

      // Filtrar transações pelo período selecionado
      let filteredTransactions = transactions
      if (startDate) {
        filteredTransactions = transactions.filter(t => {
          const transactionDate = new Date(t.date)
          const isAfterStart = transactionDate >= startDate
          const isBeforeEnd = endDate ? transactionDate <= endDate : true
          return isAfterStart && isBeforeEnd
        })
      }

      setMetrics(dashboardMetrics)
      setMonthlyData(monthlyReport)
      setEntryCategories(entryCategoryData)
      setExitCategories(exitCategoryData)
      setRecentTransactions(filteredTransactions.slice(0, 5))
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
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

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">Período:</span>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedPeriod === "day" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("day")}
                size="sm"
              >
                Hoje
              </Button>
              <Button
                variant={selectedPeriod === "month" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("month")}
                size="sm"
              >
                Mês Atual
              </Button>
              <Button
                variant={selectedPeriod === "quarter" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("quarter")}
                size="sm"
              >
                Trimestre
              </Button>
              <Button
                variant={selectedPeriod === "year" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("year")}
                size="sm"
              >
                Ano
              </Button>
              <Button
                variant={selectedPeriod === "all" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("all")}
                size="sm"
              >
                Total
              </Button>
            </div>

            <div className="flex-1 text-sm text-muted-foreground sm:text-right">
              Exibindo: <strong>{getPeriodLabel(selectedPeriod)}</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {!metrics ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <p className="text-muted-foreground">Erro ao carregar dados do dashboard</p>
          </div>
        </div>
      ) : (
        <>
          <MetricsCards metrics={metrics} period={selectedPeriod} />

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
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