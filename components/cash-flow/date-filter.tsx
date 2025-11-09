"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CashFlowService, type PaymentMethod } from "@/lib/cash-flow"
import { DatePeriodFilter, type DatePeriodFilter as DateFilterType } from "@/components/ui/date-period-filter"
import { Filter } from "lucide-react"

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | "all">("all")
  const [dateFilter, setDateFilter] = useState<DateFilterType>({
    period: currentFilter.period,
    startDate: currentFilter.startDate,
    endDate: currentFilter.endDate
  })

  const paymentMethods = CashFlowService.getPaymentMethodOptions()

  const handleDateFilterChange = (filter: DateFilterType) => {
    setDateFilter(filter)
    onFilterChange({
      period: filter.period,
      startDate: filter.startDate,
      endDate: filter.endDate,
      paymentMethod: selectedPaymentMethod === "all" ? undefined : selectedPaymentMethod
    })
  }

  const handlePaymentMethodChange = (method: PaymentMethod | "all") => {
    setSelectedPaymentMethod(method)
    onFilterChange({
      period: dateFilter.period,
      startDate: dateFilter.startDate,
      endDate: dateFilter.endDate,
      paymentMethod: method === "all" ? undefined : method
    })
  }

  return (
    <Card>
      <CardContent className="pt-4 md:pt-6">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            <span className="text-sm md:text-base font-medium">Filtros:</span>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground font-medium">Período:</span>
              <DatePeriodFilter
                onFilterChange={handleDateFilterChange}
                currentFilter={dateFilter}
              />
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
        </div>
      </CardContent>
    </Card>
  )
}