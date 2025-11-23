"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export type PeriodType = "today" | "week" | "month" | "all" | "custom"

export interface DatePeriodFilter {
  period: PeriodType
  startDate?: string
  endDate?: string
}

interface DatePeriodFilterProps {
  onFilterChange: (filter: DatePeriodFilter) => void
  currentFilter?: DatePeriodFilter
  showAllOption?: boolean
  className?: string
}

export function DatePeriodFilter({
  onFilterChange,
  currentFilter,
  showAllOption = true,
  className
}: DatePeriodFilterProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>(currentFilter?.period || "all")
  const [customDate, setCustomDate] = useState<Date | undefined>(
    currentFilter?.startDate ? new Date(currentFilter.startDate) : undefined
  )
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  const formatDate = (date: Date): string => {
    // Converte para o timezone de Brasília
    const brazilDate = new Date(date.toLocaleString('en-US', {
      timeZone: 'America/Sao_Paulo'
    }))

    const year = brazilDate.getFullYear()
    const month = String(brazilDate.getMonth() + 1).padStart(2, '0')
    const day = String(brazilDate.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const handlePeriodChange = (period: PeriodType) => {
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
        if (customDate) {
          startDate = formatDate(customDate)
          endDate = formatDate(customDate)
        }
        break
    }

    onFilterChange({ period, startDate, endDate })
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCustomDate(date)
      setSelectedPeriod("custom")
      setIsCalendarOpen(false)

      const startDate = formatDate(date)
      const endDate = formatDate(date)

      onFilterChange({
        period: "custom",
        startDate,
        endDate
      })
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <Button
        variant={selectedPeriod === "today" ? "default" : "outline"}
        onClick={() => handlePeriodChange("today")}
        size="sm"
        className="text-xs md:text-sm"
      >
        Hoje
      </Button>
      <Button
        variant={selectedPeriod === "week" ? "default" : "outline"}
        onClick={() => handlePeriodChange("week")}
        size="sm"
        className="text-xs md:text-sm"
      >
        Esta Semana
      </Button>
      <Button
        variant={selectedPeriod === "month" ? "default" : "outline"}
        onClick={() => handlePeriodChange("month")}
        size="sm"
        className="text-xs md:text-sm"
      >
        Este Mês
      </Button>
      {showAllOption && (
        <Button
          variant={selectedPeriod === "all" ? "default" : "outline"}
          onClick={() => handlePeriodChange("all")}
          size="sm"
          className="text-xs md:text-sm"
        >
          Todos
        </Button>
      )}

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
  )
}
