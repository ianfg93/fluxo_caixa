"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, DollarSign, FileText, ArrowDownCircle } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MetricsCards } from "@/components/dashboard/metrics-cards"
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart"
import { AlertsPanel } from "@/components/dashboard/alerts-panel"
import { CardReceivablesWidget } from "@/components/dashboard/card-receivables-widget"
import { CardReceivablesChart } from "@/components/dashboard/card-receivables-chart"
import { OpenRegisterDialog } from "@/components/cash-register/open-register-dialog"
import { DailyReportDialog } from "@/components/cash-register/daily-report-dialog"
import { PeriodReportDialog } from "@/components/cash-register/period-report-dialog"
import { WithdrawalDialog } from "@/components/cash-register/withdrawal-dialog"
import { CloseRegisterDialog } from "@/components/cash-register/close-register-dialog"
import { CashRegisterAlert } from "@/components/cash-register/cash-register-alert"
import { ReportsService } from "@/lib/reports"
import { CashFlowService } from "@/lib/cash-flow"
import { CardReceivablesService } from "@/lib/card-receivables"
import { CashRegisterService } from "@/lib/cash-register"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

type PeriodFilter = "day" | "month" | "quarter" | "year" | "all" | "custom"

export default function DashboardPage() {
  const { authState } = useAuth()
  const [metrics, setMetrics] = useState<any>(null)
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [entryCategories, setEntryCategories] = useState<any[]>([])
  const [exitCategories, setExitCategories] = useState<any[]>([])
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])
  const [receivablesChartData, setReceivablesChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [availableCompanies, setAvailableCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("day")
  const [customDate, setCustomDate] = useState<Date>()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Estados para controle dos diálogos de caixa
  const [openRegisterDialogOpen, setOpenRegisterDialogOpen] = useState(false)
  const [dailyReportDialogOpen, setDailyReportDialogOpen] = useState(false)
  const [periodReportDialogOpen, setPeriodReportDialogOpen] = useState(false)
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false)
  const [closeRegisterDialogOpen, setCloseRegisterDialogOpen] = useState(false)
  const [cashRegisterStatus, setCashRegisterStatus] = useState<'open' | 'closed' | 'none'>('none')
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [expectedClosingAmount, setExpectedClosingAmount] = useState<number>(0)

  const isMaster = authState.user?.role === 'master'
  const isAdmin = authState.user?.role === 'administrator' || isMaster

  const handleDateSelect = (date: Date | undefined) => {
    console.log('handleDateSelect chamado com:', date)
    if (date) {
      setCustomDate(date)
      setSelectedPeriod("custom")
      setIsCalendarOpen(false)
    }
  }

  useEffect(() => {
    if (isMaster) {
      loadAvailableCompanies()
    }
    loadDashboardData()
    checkCashRegisterStatus()
  }, [selectedCompany, selectedPeriod, customDate])

  async function checkCashRegisterStatus() {
    try {
      // Converte para o timezone de Brasília
      const now = new Date()
      const brazilDate = new Date(now.toLocaleString('en-US', {
        timeZone: 'America/Sao_Paulo'
      }))

      const year = brazilDate.getFullYear()
      const month = String(brazilDate.getMonth() + 1).padStart(2, '0')
      const day = String(brazilDate.getDate()).padStart(2, '0')
      const today = `${year}-${month}-${day}`

      const sessions = await CashRegisterService.getSessions('open', today)
      if (sessions.length > 0) {
        setCashRegisterStatus('open')
        setCurrentSessionId(sessions[0].id)

        // Buscar o relatório para calcular o valor esperado EM DINHEIRO FÍSICO
        const report = await CashRegisterService.getDailyReport(today)
        if (report) {
          // Calcular saídas pagas em dinheiro
          const exitsCashTotal = report.exits
            .filter((exit: any) => exit.paymentMethod === 'dinheiro')
            .reduce((sum: number, exit: any) => sum + exit.amount, 0)
          // Calcular apenas dinheiro físico: Abertura + Vendas em Dinheiro - Sangrias - Saídas em Dinheiro
          const cashInHand = report.summary.openingAmount +
                            (report.summary.paymentTotals.dinheiro || 0) -
                            (report.summary.totalWithdrawals || 0) -
                            exitsCashTotal
          setExpectedClosingAmount(cashInHand)
        }
      } else {
        setCashRegisterStatus('none')
      }
    } catch (error) {
      console.error('Erro ao verificar status do caixa:', error)
    }
  }

  function handleOpenRegisterSuccess() {
    setCashRegisterStatus('open')
    loadDashboardData()
    checkCashRegisterStatus()
  }

  function handleWithdrawalSuccess() {
    loadDashboardData()
    checkCashRegisterStatus()
  }

  function handleCloseRegisterSuccess() {
    setCashRegisterStatus('none')
    setCurrentSessionId('')
    setExpectedClosingAmount(0)
    loadDashboardData()
  }

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
    // Se for data customizada, usar a data selecionada
    if (period === "custom" && customDate) {
      return new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate(), 0, 0, 0, 0)
    }

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

      case "custom":
        // Se não houver data customizada, retornar undefined
        return undefined

      default:
        return undefined
    }
  }

  // Calcular data de fim para períodos específicos
  function getEndDate(period: PeriodFilter): Date | undefined {
    // Se for data customizada, usar a data selecionada
    if (period === "custom" && customDate) {
      return new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate(), 23, 59, 59, 999)
    }

    const now = new Date()

    switch (period) {
      case "day":
        // Final do dia atual (23:59:59.999)
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

      case "custom":
        // Se não houver data customizada, retornar undefined
        return undefined

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

      case "custom":
        if (customDate) {
          return customDate.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
          })
        }
        return "Data personalizada"

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

      const [dashboardMetrics, monthlyReport, entryCategoryData, exitCategoryData, transactions, receivables] = await Promise.all([
        ReportsService.getDashboardMetrics(companyFilter, startDate, endDate),
        ReportsService.getMonthlyData(companyFilter, startDate, endDate),
        ReportsService.getCategoryBreakdown("entry", companyFilter, startDate, endDate),
        ReportsService.getCategoryBreakdown("exit", companyFilter, startDate, endDate),
        CashFlowService.getTransactions(undefined, companyFilter),
        CardReceivablesService.getCardReceivables(),
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

      // Processar dados de recebíveis para o gráfico
      const chartData = processReceivablesForChart(receivables, startDate, endDate)

      setMetrics(dashboardMetrics)
      setMonthlyData(monthlyReport)
      setEntryCategories(entryCategoryData)
      setExitCategories(exitCategoryData)
      setRecentTransactions(filteredTransactions.slice(0, 5))
      setReceivablesChartData(chartData)
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  function processReceivablesForChart(receivables: any[], startDate?: Date, endDate?: Date) {
    // Filtrar por período se fornecido
    let filtered = receivables
    if (startDate || endDate) {
      filtered = receivables.filter(r => {
        const settlementDate = new Date(r.settlementDate)
        const isAfterStart = startDate ? settlementDate >= startDate : true
        const isBeforeEnd = endDate ? settlementDate <= endDate : true
        return isAfterStart && isBeforeEnd
      })
    }

    // Agrupar por data de liquidação
    const grouped = filtered.reduce((acc: any, r: any) => {
      const date = new Date(r.settlementDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

      if (!acc[date]) {
        acc[date] = { date, debit: 0, credit: 0, total: 0, fees: 0 }
      }

      if (r.cardType === 'debito') {
        acc[date].debit += r.netAmount
      } else {
        acc[date].credit += r.netAmount
      }

      acc[date].total += r.netAmount
      acc[date].fees += r.grossAmount - r.netAmount

      return acc
    }, {})

    // Converter para array e ordenar por data
    return Object.values(grouped).sort((a: any, b: any) => {
      const [dayA, monthA] = a.date.split('/')
      const [dayB, monthB] = b.date.split('/')
      return new Date(2024, parseInt(monthA) - 1, parseInt(dayA)).getTime() -
             new Date(2024, parseInt(monthB) - 1, parseInt(dayB)).getTime()
    })
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Visão geral completa do fluxo de caixa
            {selectedCompany && selectedCompany !== 'all' && ` - ${availableCompanies.find(c => c.id === selectedCompany)?.name}`}
          </p>
        </div>

        {/* Botões de Caixa */}
        <div className="flex flex-wrap gap-2">
          {cashRegisterStatus === 'none' && (
            <Button
              onClick={() => setOpenRegisterDialogOpen(true)}
              variant="default"
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <DollarSign className="h-4 w-4" />
              Abrir Caixa
            </Button>
          )}

            <Button
              onClick={() => setWithdrawalDialogOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2 border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              <ArrowDownCircle className="h-4 w-4" />
              Sangria
            </Button>

          <Button
            onClick={() => setDailyReportDialogOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            Relatório Diário
          </Button>

          <Button
            onClick={() => setPeriodReportDialogOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            <CalendarIcon className="h-4 w-4" />
            Relatório por Período
          </Button>
        </div>
      </div>

      {/* Diálogos */}
      <OpenRegisterDialog
        open={openRegisterDialogOpen}
        onOpenChange={setOpenRegisterDialogOpen}
        onSuccess={handleOpenRegisterSuccess}
      />
      <WithdrawalDialog
        open={withdrawalDialogOpen}
        onOpenChange={setWithdrawalDialogOpen}
        onSuccess={handleWithdrawalSuccess}
      />
      <CloseRegisterDialog
        open={closeRegisterDialogOpen}
        onOpenChange={setCloseRegisterDialogOpen}
        onSuccess={handleCloseRegisterSuccess}
        sessionId={currentSessionId}
        expectedAmount={expectedClosingAmount}
      />
      <DailyReportDialog
        open={dailyReportDialogOpen}
        onOpenChange={setDailyReportDialogOpen}
        onCloseRegister={() => setCloseRegisterDialogOpen(true)}
      />
      <PeriodReportDialog
        open={periodReportDialogOpen}
        onOpenChange={setPeriodReportDialogOpen}
      />

      {/* Aviso de Caixa Fechado */}
      {cashRegisterStatus === 'none' && !loading && (
        <CashRegisterAlert onOpenRegister={() => setOpenRegisterDialogOpen(true)} />
      )}

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 md:pt-6">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
              <span className="text-sm md:text-base font-medium">Período:</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedPeriod === "day" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("day")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Hoje
              </Button>
              <Button
                variant={selectedPeriod === "month" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("month")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Mês
              </Button>
              <Button
                variant={selectedPeriod === "quarter" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("quarter")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Trimestre
              </Button>
              <Button
                variant={selectedPeriod === "year" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("year")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Ano
              </Button>
              <Button
                variant={selectedPeriod === "all" ? "default" : "outline"}
                onClick={() => setSelectedPeriod("all")}
                size="sm"
                className="text-xs md:text-sm"
              >
                Total
              </Button>

              {/* Botão de Data Customizada com Calendário */}
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant={selectedPeriod === "custom" ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "text-xs md:text-sm justify-start text-left font-normal",
                      !customDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDate ? format(customDate, "dd/MM/yyyy") : "Data personalizada"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customDate}
                    onSelect={handleDateSelect}
                    defaultMonth={customDate}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="text-xs md:text-sm text-muted-foreground">
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

          {/* Card Receivables Widget */}
          <CardReceivablesWidget startDate={getStartDate(selectedPeriod)} endDate={getEndDate(selectedPeriod)} />

          <Tabs defaultValue="overview" className="space-y-4 md:space-y-6">
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="overview" className="text-sm md:text-base">Visão Geral</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                <CashFlowChart data={monthlyData} />
                <CardReceivablesChart data={receivablesChartData} />
              </div>

              <AlertsPanel />

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Transações Recentes</CardTitle>
                  <CardDescription className="text-xs md:text-sm">Últimas movimentações do fluxo de caixa</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 md:space-y-4">
                    {recentTransactions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Nenhuma transação encontrada</p>
                    ) : (
                      recentTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 md:p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            {transaction.type === "entry" ? (
                              <TrendingUp className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm md:text-base truncate">{transaction.description}</p>
                              <p className="text-xs md:text-sm text-muted-foreground">
                                {formatDate(transaction.date)} • {transaction.category}
                              </p>
                            </div>
                          </div>
                          <div className={`font-bold text-sm md:text-base whitespace-nowrap ${transaction.type === "entry" ? "text-green-600" : "text-red-600"}`}>
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