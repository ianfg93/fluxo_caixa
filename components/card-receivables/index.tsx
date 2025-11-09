"use client"

import { useState, useEffect } from "react"
import { CardReceivablesService, type CardReceivable } from "@/lib/card-receivables"
import { Settings as SettingsIcon, CreditCard, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Indicators } from "./indicators"
import { Filters, type DateFilter } from "./filters"
import { ReceivablesList } from "./receivables-list"
import { SettingsForm } from "./settings-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function CardReceivables() {
  const [receivables, setReceivables] = useState<CardReceivable[]>([])
  const [filteredReceivables, setFilteredReceivables] = useState<CardReceivable[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dateFilter, setDateFilter] = useState<DateFilter>({ startDate: "", endDate: "" })

  useEffect(() => {
    loadReceivables()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [receivables, dateFilter])

  const loadReceivables = async () => {
    try {
      setIsLoading(true)
      const data = await CardReceivablesService.getCardReceivables()
      setReceivables(data)
    } catch (error) {
      console.error("Error loading receivables:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = receivables

    // Apply date filter on settlement date (when money will be received)
    if (dateFilter.startDate && dateFilter.endDate) {
      const [startYear, startMonth, startDay] = dateFilter.startDate.split('-').map(Number)
      const [endYear, endMonth, endDay] = dateFilter.endDate.split('-').map(Number)

      const startDate = new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0)
      const endDate = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999)


      filtered = filtered.filter((item) => {
        let itemDate: Date

        if (item.settlementDate instanceof Date) {
          itemDate = new Date(
            item.settlementDate.getFullYear(),
            item.settlementDate.getMonth(),
            item.settlementDate.getDate(),
            0, 0, 0, 0
          )
        } else {
          const itemDateStr = String(item.settlementDate).split('T')[0]
          const [itemYear, itemMonth, itemDay] = itemDateStr.split('-').map(Number)
          itemDate = new Date(itemYear, itemMonth - 1, itemDay, 0, 0, 0, 0)
        }

        const isInRange = itemDate >= startDate && itemDate <= endDate

        return isInRange
      })
    }

    setFilteredReceivables(filtered)
  }

  const handleSettingsUpdate = () => {
    // Reload receivables to recalculate with new settings
    loadReceivables()
  }

  const summary = CardReceivablesService.calculateSummary(filteredReceivables)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Recebíveis de Cartão
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize os valores a receber das transações com cartão
          </p>
        </div>
        <Button onClick={loadReceivables} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="transactions">
            <CreditCard className="mr-2 h-4 w-4" />
            Transações
          </TabsTrigger>
          <TabsTrigger value="settings">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
          <Filters onFilterChange={setDateFilter} />
          <Indicators summary={summary} />
          <ReceivablesList receivables={filteredReceivables} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SettingsForm onSettingsUpdated={handleSettingsUpdate} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
