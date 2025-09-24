"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar, Filter, X } from "lucide-react"

export type DateFilter = {
  period?: "today" | "month" | "quarter" | "year" | "custom"
  startDate?: string
  endDate?: string
}

interface DateFilterProps {
  onFilterChange: (filter: DateFilter) => void
  currentFilter: DateFilter
}

export function DateFilter({ onFilterChange, currentFilter }: DateFilterProps) {
  const [showCustom, setShowCustom] = useState(currentFilter.period === "custom")

  // Definir filtro padrão como "hoje" na primeira renderização
  React.useEffect(() => {
    if (!currentFilter.period) {
      handlePeriodChange("today")
    }
  }, [])

  const handlePeriodChange = (period: string) => {
    const today = new Date()
    let filter: DateFilter = { period: period as DateFilter["period"] }

    switch (period) {
      case "today":
        const todayStr = today.toISOString().split("T")[0]
        filter = { period: "today", startDate: todayStr, endDate: todayStr }
        setShowCustom(false)
        break
      
      case "month":
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        filter = { 
          period: "month", 
          startDate: monthStart.toISOString().split("T")[0], 
          endDate: monthEnd.toISOString().split("T")[0] 
        }
        setShowCustom(false)
        break
      
      case "quarter":
        const quarterStart = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)
        const quarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0)
        filter = { 
          period: "quarter", 
          startDate: quarterStart.toISOString().split("T")[0], 
          endDate: quarterEnd.toISOString().split("T")[0] 
        }
        setShowCustom(false)
        break
      
      case "year":
        const yearStart = new Date(today.getFullYear(), 0, 1)
        const yearEnd = new Date(today.getFullYear(), 11, 31)
        filter = { 
          period: "year", 
          startDate: yearStart.toISOString().split("T")[0], 
          endDate: yearEnd.toISOString().split("T")[0] 
        }
        setShowCustom(false)
        break
      
      case "custom":
        filter = { period: "custom" }
        setShowCustom(true)
        break
      
      default:
        filter = {}
        setShowCustom(false)
    }

    onFilterChange(filter)
  }

  const handleCustomDateChange = (field: "startDate" | "endDate", value: string) => {
    const newFilter = { ...currentFilter, [field]: value }
    onFilterChange(newFilter)
  }

  const clearFilter = () => {
    setShowCustom(false)
    onFilterChange({})
  }

  const getPeriodLabel = () => {
    switch (currentFilter.period) {
      case "today": return "Hoje"
      case "month": return "Este Mês"
      case "quarter": return "Este Trimestre" 
      case "year": return "Este Ano"
      case "custom": return "Período Personalizado"
      default: return "Todos os Períodos"
    }
  }

  const getDateRangeText = () => {
    if (currentFilter.startDate && currentFilter.endDate) {
      const start = new Date(currentFilter.startDate).toLocaleDateString("pt-BR")
      const end = new Date(currentFilter.endDate).toLocaleDateString("pt-BR")
      return currentFilter.startDate === currentFilter.endDate ? start : `${start} - ${end}`
    }
    return ""
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Label className="font-medium">Filtrar por período:</Label>
          </div>
          
          <Select value={currentFilter.period || ""} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Selecione um período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Períodos</SelectItem>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
              <SelectItem value="custom">Período Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {currentFilter.period && (
            <Button variant="outline" size="sm" onClick={clearFilter}>
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>

        {showCustom && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input
                id="startDate"
                type="date"
                value={currentFilter.startDate || ""}
                onChange={(e) => handleCustomDateChange("startDate", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input
                id="endDate"
                type="date"
                value={currentFilter.endDate || ""}
                onChange={(e) => handleCustomDateChange("endDate", e.target.value)}
              />
            </div>
          </div>
        )}

        {currentFilter.period && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Exibindo: {getPeriodLabel()}</span>
            {getDateRangeText() && (
              <span className="font-medium">({getDateRangeText()})</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}