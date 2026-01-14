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
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(() => {
    if (currentFilter?.startDate) {
      const [year, month, day] = currentFilter.startDate.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
    return undefined
  })
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(() => {
    if (currentFilter?.endDate) {
      const [year, month, day] = currentFilter.endDate.split('-').map(Number)
      return new Date(year, month - 1, day)
    }
    return undefined
  })
  const [isStartCalendarOpen, setIsStartCalendarOpen] = useState(false)
  const [isEndCalendarOpen, setIsEndCalendarOpen] = useState(false)

  const getBrazilDate = (): Date => {
    // Obtém a data/hora atual no fuso horário de Brasília
    const now = new Date()
    const brazilDateStr = now.toLocaleString('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })

    // Parse do formato: MM/DD/YYYY, HH:mm:ss
    const [datePart, timePart] = brazilDateStr.split(', ')
    const [month, day, year] = datePart.split('/').map(Number)
    const [hour, minute, second] = timePart.split(':').map(Number)

    return new Date(year, month - 1, day, hour, minute, second)
  }

  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')

    return `${year}-${month}-${day}`
  }

  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period)

    const today = getBrazilDate()
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
        if (customStartDate && customEndDate) {
          startDate = formatDate(customStartDate)
          endDate = formatDate(customEndDate)
        } else if (customStartDate) {
          startDate = formatDate(customStartDate)
          endDate = formatDate(customStartDate)
        }
        break
    }

    onFilterChange({ period, startDate, endDate })
  }

  const handleStartDateSelect = (date: Date | undefined) => {
    if (date) {
      setCustomStartDate(date)
      setSelectedPeriod("custom")
      setIsStartCalendarOpen(false)

      const startDate = formatDate(date)
      const endDate = customEndDate ? formatDate(customEndDate) : formatDate(date)

      onFilterChange({
        period: "custom",
        startDate,
        endDate
      })
    }
  }

  const handleEndDateSelect = (date: Date | undefined) => {
    if (date) {
      setCustomEndDate(date)
      setSelectedPeriod("custom")
      setIsEndCalendarOpen(false)

      const startDate = customStartDate ? formatDate(customStartDate) : formatDate(date)
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

      {/* Botões de Período Personalizado - Data Início */}
      <Popover open={isStartCalendarOpen} onOpenChange={setIsStartCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedPeriod === "custom" ? "default" : "outline"}
            size="sm"
            className={cn(
              "text-xs md:text-sm justify-start text-left font-normal",
              !customStartDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {customStartDate ? format(customStartDate, "dd/MM/yyyy") : "Data início"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={customStartDate}
            onSelect={handleStartDateSelect}
            defaultMonth={customStartDate}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>

      {/* Data Fim */}
      <Popover open={isEndCalendarOpen} onOpenChange={setIsEndCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={selectedPeriod === "custom" ? "default" : "outline"}
            size="sm"
            className={cn(
              "text-xs md:text-sm justify-start text-left font-normal",
              !customEndDate && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {customEndDate ? format(customEndDate, "dd/MM/yyyy") : "Data fim"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={customEndDate}
            onSelect={handleEndDateSelect}
            defaultMonth={customEndDate || customStartDate}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
