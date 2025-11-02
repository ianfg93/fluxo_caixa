"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, TrendingDown, TrendingUp } from "lucide-react"
import { CardReceivablesService, type CardReceivable } from "@/lib/card-receivables"
import Link from "next/link"

type PeriodFilter = "day" | "month" | "quarter" | "year" | "all"

interface CardReceivablesWidgetProps {
  startDate?: Date
  endDate?: Date
}

export function CardReceivablesWidget({ startDate, endDate }: CardReceivablesWidgetProps) {
  const [receivables, setReceivables] = useState<CardReceivable[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReceivables()
  }, [startDate, endDate])

  const loadReceivables = async () => {
    try {
      setLoading(true)
      const data = await CardReceivablesService.getCardReceivables()

      // Filter by date range if provided
      let filtered = data
      if (startDate || endDate) {
        filtered = data.filter(r => {
          const settlementDate = new Date(r.settlementDate)
          const isAfterStart = startDate ? settlementDate >= startDate : true
          const isBeforeEnd = endDate ? settlementDate <= endDate : true
          return isAfterStart && isBeforeEnd
        })
      }

      setReceivables(filtered)
    } catch (error) {
      console.error("Error loading card receivables:", error)
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

  const getToday = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  const getWeekEnd = () => {
    const today = new Date()
    const weekEnd = new Date(today)
    weekEnd.setDate(today.getDate() + 7)
    weekEnd.setHours(23, 59, 59, 999)
    return weekEnd
  }

  const getMonthEnd = () => {
    const today = new Date()
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    monthEnd.setHours(23, 59, 59, 999)
    return monthEnd
  }

  // Calcular valores
  const today = getToday()
  const weekEnd = getWeekEnd()
  const monthEnd = getMonthEnd()

  const todayReceivables = receivables.filter(r => {
    const settlementDate = new Date(r.settlementDate)
    settlementDate.setHours(0, 0, 0, 0)
    return settlementDate.getTime() === today.getTime()
  })

  const weekReceivables = receivables.filter(r => {
    const settlementDate = new Date(r.settlementDate)
    return settlementDate >= today && settlementDate <= weekEnd
  })

  const monthReceivables = receivables.filter(r => {
    const settlementDate = new Date(r.settlementDate)
    return settlementDate >= today && settlementDate <= monthEnd
  })

  const summary = CardReceivablesService.calculateSummary(receivables)
  const todaySummary = CardReceivablesService.calculateSummary(todayReceivables)
  const weekSummary = CardReceivablesService.calculateSummary(weekReceivables)
  const monthSummary = CardReceivablesService.calculateSummary(monthReceivables)

  // Separar por tipo
  const debitReceivables = receivables.filter(r => r.cardType === 'debito')
  const creditReceivables = receivables.filter(r => r.cardType === 'credito')

  const debitSummary = CardReceivablesService.calculateSummary(debitReceivables)
  const creditSummary = CardReceivablesService.calculateSummary(creditReceivables)

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Recebíveis de Cartão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Link href="/card-receivables" className="block">
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recebíveis de Cartão
            </CardTitle>
            <CardDescription className="text-xs">Ver detalhes →</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo Principal em Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Total a Receber */}
            <div className="col-span-2 md:col-span-1 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Total a Receber</p>
              <p className="text-xl font-bold text-green-600">{formatCurrency(summary.totalNet)}</p>
            </div>

            {/* Hoje */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Hoje</p>
              <p className="text-base font-bold text-foreground">{formatCurrency(todaySummary.totalNet)}</p>
              <p className="text-xs text-muted-foreground">{todayReceivables.length} transação(ões)</p>
            </div>

            {/* 7 dias */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">7 dias</p>
              <p className="text-base font-bold text-foreground">{formatCurrency(weekSummary.totalNet)}</p>
              <p className="text-xs text-muted-foreground">{weekReceivables.length} transação(ões)</p>
            </div>

            {/* Este mês */}
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Este mês</p>
              <p className="text-base font-bold text-foreground">{formatCurrency(monthSummary.totalNet)}</p>
              <p className="text-xs text-muted-foreground">{monthReceivables.length} transação(ões)</p>
            </div>
          </div>

          {/* Breakdown por Tipo de Cartão */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t">
            {/* Débito */}
            <div className="flex items-center gap-3 p-2">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Débito</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(debitSummary.totalNet)}</p>
                <p className="text-xs text-muted-foreground">{debitReceivables.length} transações</p>
              </div>
            </div>

            {/* Crédito */}
            <div className="flex items-center gap-3 p-2">
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-950/30 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Crédito</p>
                <p className="text-sm font-bold text-foreground">{formatCurrency(creditSummary.totalNet)}</p>
                <p className="text-xs text-muted-foreground">{creditReceivables.length} transações</p>
              </div>
            </div>

            {/* Total de Taxas */}
            <div className="flex items-center gap-3 p-2">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="h-5 w-5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Taxas Totais</p>
                <p className="text-sm font-bold text-red-600">{formatCurrency(summary.totalFees)}</p>
                <p className="text-xs text-muted-foreground">Bruto: {formatCurrency(summary.totalGross)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
