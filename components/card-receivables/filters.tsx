"use client"

import { useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Filter } from "lucide-react"
import { DatePeriodFilter, type DatePeriodFilter as DateFilterType } from "@/components/ui/date-period-filter"

export interface DateFilter {
  startDate: string
  endDate: string
}

interface FiltersProps {
  onFilterChange: (filter: DateFilter) => void
}

export function Filters({ onFilterChange }: FiltersProps) {
  const handleDateFilterChange = (filter: DateFilterType) => {
    onFilterChange({
      startDate: filter.startDate || "",
      endDate: filter.endDate || ""
    })
  }

  // Apply initial filter on mount
  useEffect(() => {
    // Converte para o timezone de Brasília
    const now = new Date()
    const brazilDate = new Date(now.toLocaleString('en-US', {
      timeZone: 'America/Sao_Paulo'
    }))

    const year = brazilDate.getFullYear()
    const month = String(brazilDate.getMonth() + 1).padStart(2, '0')
    const day = String(brazilDate.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`

    onFilterChange({ startDate: today, endDate: today })
  }, [])

  return (
    <Card>
      <CardContent className="pt-4 md:pt-6">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            <span className="text-sm md:text-base font-medium">Filtros:</span>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs text-muted-foreground font-medium">Período:</span>
            <DatePeriodFilter
              onFilterChange={handleDateFilterChange}
              currentFilter={{ period: "today" }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
