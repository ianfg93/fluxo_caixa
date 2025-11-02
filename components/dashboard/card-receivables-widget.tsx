"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, TrendingDown, TrendingUp } from "lucide-react"
import { CardReceivablesService, type CardReceivable } from "@/lib/card-receivables"
import Link from "next/link"

export function CardReceivablesWidget() {
  const [receivables, setReceivables] = useState<CardReceivable[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReceivables()
  }, [])

  const loadReceivables = async () => {
    try {
      setLoading(true)
      const data = await CardReceivablesService.getCardReceivables()
      setReceivables(data)
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
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
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
    <div className="space-y-4">
      {/* Card Principal - Resumo Total */}
      <Link href="/card-receivables">
        <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Recebíveis de Cartão
            </CardTitle>
            <CardDescription>Valores a receber das operadoras</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Total a Receber</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalNet)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Bruto</p>
                  <p className="font-semibold">{formatCurrency(summary.totalGross)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Taxas</p>
                  <p className="font-semibold text-red-600">{formatCurrency(summary.totalFees)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Grid de Cards de Período */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Hoje</p>
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">{todayReceivables.length}</span> transação(ões)
            </p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(todaySummary.totalNet)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Próximos 7 dias</p>
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">{weekReceivables.length}</span> transação(ões)
            </p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(weekSummary.totalNet)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Este mês</p>
            <p className="text-sm text-muted-foreground mb-2">
              <span className="font-medium">{monthReceivables.length}</span> transação(ões)
            </p>
            <p className="text-lg font-bold text-green-600">
              {formatCurrency(monthSummary.totalNet)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown por Tipo de Cartão */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Débito</p>
                  <p className="text-xs text-muted-foreground">{debitReceivables.length} transações</p>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(debitSummary.totalNet)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Taxas: {formatCurrency(debitSummary.totalFees)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Crédito</p>
                  <p className="text-xs text-muted-foreground">{creditReceivables.length} transações</p>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(creditSummary.totalNet)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Taxas: {formatCurrency(creditSummary.totalFees)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
