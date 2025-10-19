"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock, CreditCard } from "lucide-react"

type PeriodFilter = "day" | "month" | "quarter" | "year" | "all"

interface MetricsCardsProps {
  metrics: {
    totalBalance: number
    monthlyEntries: number
    monthlyExits: number
    pendingPayables: number
    overduePayables: number
    upcomingPayments: number
  }
  period?: PeriodFilter
}

export function MetricsCards({ metrics, period = "day" }: MetricsCardsProps) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const getPeriodLabel = (period: PeriodFilter): { entries: string; exits: string } => {
    switch (period) {
      case "day":
        return {
          entries: "Entradas do Dia",
          exits: "Saídas do Dia"
        }
      case "month":
        return {
          entries: "Entradas do Mês",
          exits: "Saídas do Mês"
        }
      case "quarter":
        return {
          entries: "Entradas do Trimestre",
          exits: "Saídas do Trimestre"
        }
      case "year":
        return {
          entries: "Entradas do Ano",
          exits: "Saídas do Ano"
        }
      case "all":
        return {
          entries: "Total de Entradas",
          exits: "Total de Saídas"
        }
      default:
        return {
          entries: "Entradas do Período",
          exits: "Saídas do Período"
        }
    }
  }

  const labels = getPeriodLabel(period)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.totalBalance >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(metrics.totalBalance)}
          </div>
          <p className="text-xs text-muted-foreground">Entradas - Saídas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{labels.entries}</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.monthlyEntries)}</div>
          <p className="text-xs text-muted-foreground">Receitas do período</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{labels.exits}</CardTitle>
          <TrendingDown className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.monthlyExits)}</div>
          <p className="text-xs text-muted-foreground">Despesas do período</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contas Pendentes</CardTitle>
          <CreditCard className="h-4 w-4 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{formatCurrency(metrics.pendingPayables)}</div>
          <p className="text-xs text-muted-foreground">Aguardando pagamento</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Contas em Atraso</CardTitle>
          <AlertTriangle className="h-4 w-4 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{formatCurrency(metrics.overduePayables)}</div>
          <p className="text-xs text-muted-foreground">Vencidas e não pagas</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Próximos 7 Dias</CardTitle>
          <Clock className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(metrics.upcomingPayments)}</div>
          <p className="text-xs text-muted-foreground">Vencimentos próximos</p>
        </CardContent>
      </Card>
    </div>
  )
}