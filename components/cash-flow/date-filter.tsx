"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CashFlowService, type PaymentMethod } from "@/lib/cash-flow"

export interface DateFilter {
  period: "today" | "week" | "month" | "custom" | "all"
  startDate?: string
  endDate?: string
  paymentMethod?: PaymentMethod | "all"
}

interface DateFilterProps {
  onFilterChange: (filter: DateFilter) => void
  currentFilter: DateFilter
}

export function DateFilter({ onFilterChange, currentFilter }: DateFilterProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<DateFilter["period"]>(currentFilter.period)
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | "all">("all")

  const paymentMethods = CashFlowService.getPaymentMethodOptions()

  useEffect(() => {
    handlePeriodChange(selectedPeriod)
  }, [])

  const handlePeriodChange = (period: DateFilter["period"]) => {
    setSelectedPeriod(period)
    
    const today = new Date()
    let startDate: string | undefined
    let endDate: string | undefined

    switch (period) {
      case "today":
        startDate = formatDate(today)
        endDate = formatDate(today)
        break
      
      case "week":
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - today.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        startDate = formatDate(weekStart)
        endDate = formatDate(weekEnd)
        break
      
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        startDate = formatDate(monthStart)
        endDate = formatDate(monthEnd)
        break
      
      case "all":
        startDate = undefined
        endDate = undefined
        break
      
      case "custom":
        return
    }

    onFilterChange({ 
      period, 
      startDate, 
      endDate,
      paymentMethod: selectedPaymentMethod === "all" ? undefined : selectedPaymentMethod
    })
  }

  const handlePaymentMethodChange = (method: PaymentMethod | "all") => {
    setSelectedPaymentMethod(method)
    onFilterChange({
      period: selectedPeriod,
      startDate: selectedPeriod === "custom" ? customStartDate : currentFilter.startDate,
      endDate: selectedPeriod === "custom" ? customEndDate : currentFilter.endDate,
      paymentMethod: method === "all" ? undefined : method
    })
  }

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      onFilterChange({
        period: "custom",
        startDate: customStartDate,
        endDate: customEndDate,
        paymentMethod: selectedPaymentMethod === "all" ? undefined : selectedPaymentMethod
      })
    }
  }

  const formatDate = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Esta Semana</SelectItem>
                  <SelectItem value="month">Este Mês</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={selectedPaymentMethod} onValueChange={handlePaymentMethodChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedPeriod === "custom" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleCustomDateChange}
                  disabled={!customStartDate || !customEndDate}
                  className="w-full"
                >
                  Aplicar
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}