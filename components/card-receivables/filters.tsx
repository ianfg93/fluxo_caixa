"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Filter } from "lucide-react"

export interface DateFilter {
  startDate: string
  endDate: string
}

interface FiltersProps {
  onFilterChange: (filter: DateFilter) => void
}

type FilterType = "all" | "today" | "week" | "month" | "custom"

export function Filters({ onFilterChange }: FiltersProps) {
  const [periodFilter, setPeriodFilter] = useState<FilterType>("today")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")

  const getToday = () => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  }

  const getWeekStart = () => {
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    return weekStart.toISOString().split("T")[0]
  }

  const getWeekEnd = () => {
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return weekEnd.toISOString().split("T")[0]
  }

  const getMonthStart = () => {
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    return monthStart.toISOString().split("T")[0]
  }

  const getMonthEnd = () => {
    const today = new Date()
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return monthEnd.toISOString().split("T")[0]
  }

  const handlePeriodChange = (period: FilterType) => {
    setPeriodFilter(period)

    let startDate = ""
    let endDate = ""

    switch (period) {
      case "today":
        startDate = getToday()
        endDate = getToday()
        break
      case "week":
        startDate = getWeekStart()
        endDate = getWeekEnd()
        break
      case "month":
        startDate = getMonthStart()
        endDate = getMonthEnd()
        break
      case "all":
        startDate = ""
        endDate = ""
        break
      case "custom":
        return
    }

    onFilterChange({ startDate, endDate })
  }

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      onFilterChange({
        startDate: customStartDate,
        endDate: customEndDate,
      })
    }
  }

  // Apply initial filter on mount
  useEffect(() => {
    const today = getToday()
    onFilterChange({ startDate: today, endDate: today })
  }, [])

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Filtros:</span>
          </div>
          <select
            className="px-3 py-1.5 border rounded-md text-sm min-w-[140px]"
            value={periodFilter}
            onChange={(e) => handlePeriodChange(e.target.value as FilterType)}
          >
            <option value="all">Todos Períodos</option>
            <option value="today">Hoje</option>
            <option value="week">Esta Semana</option>
            <option value="month">Este Mês</option>
            <option value="custom">Personalizado</option>
          </select>
          {periodFilter === "custom" && (
            <>
              <input
                type="date"
                className="px-3 py-1.5 border rounded-md text-sm"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                placeholder="Data inicial"
              />
              <input
                type="date"
                className="px-3 py-1.5 border rounded-md text-sm"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                placeholder="Data final"
              />
              <Button
                size="sm"
                onClick={handleCustomDateApply}
                disabled={!customStartDate || !customEndDate}
              >
                Aplicar
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
