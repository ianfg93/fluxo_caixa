"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Clock, TrendingDown } from "lucide-react"
import { AccountsPayableService } from "@/lib/accounts-payable"
import { useEffect, useState } from "react"

export function AlertsPanel() {
  const [alerts, setAlerts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true)
        
        // Aguardar todas as chamadas assíncronas
        const [overdueAccounts, upcomingPayments, allAccounts] = await Promise.all([
          AccountsPayableService.getOverdueAccounts(),
          AccountsPayableService.getUpcomingPayments(7),
          AccountsPayableService.getAccountsPayable()
        ])

        // Filtrar pagamentos urgentes após receber os dados
        const urgentPayments = allAccounts.filter(
          (a) => a.priority === "urgent" && a.status === "pending"
        )

        const alertsList = [
          ...overdueAccounts.map((account) => ({
            type: "overdue",
            title: "Conta em Atraso",
            description: `${account.supplierName} - ${account.description}`,
            amount: account.amount,
            date: account.dueDate,
            priority: "high",
          })),
          ...upcomingPayments.map((account) => ({
            type: "upcoming",
            title: "Vencimento Próximo",
            description: `${account.supplierName} - ${account.description}`,
            amount: account.amount,
            date: account.dueDate,
            priority: "medium",
          })),
          ...urgentPayments.map((account) => ({
            type: "urgent",
            title: "Pagamento Urgente",
            description: `${account.supplierName} - ${account.description}`,
            amount: account.amount,
            date: account.dueDate,
            priority: "urgent",
          })),
        ].slice(0, 10) // Limit to 10 alerts

        setAlerts(alertsList)
      } catch (error) {
        console.error('Erro ao carregar alertas:', error)
        setAlerts([])
      } finally {
        setLoading(false)
      }
    }

    loadAlerts()
  }, [])

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR")
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "overdue":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "upcoming":
        return <Clock className="h-4 w-4 text-orange-600" />
      case "urgent":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case "overdue":
        return "bg-red-100 text-red-800"
      case "upcoming":
        return "bg-orange-100 text-orange-800"
      case "urgent":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas e Notificações</CardTitle>
          <CardDescription>Contas que requerem atenção imediata</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">Carregando alertas...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas e Notificações</CardTitle>
        <CardDescription>Contas que requerem atenção imediata</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum alerta no momento</p>
          ) : (
            alerts.map((alert, index) => (
              <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                {getAlertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{alert.title}</h4>
                    <Badge className={getAlertColor(alert.type)}>
                      {alert.type === "overdue" ? "Atrasado" : alert.type === "upcoming" ? "Próximo" : "Urgente"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{formatCurrency(alert.amount)}</span>
                    <span className="text-muted-foreground">Vencimento: {formatDate(alert.date)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}