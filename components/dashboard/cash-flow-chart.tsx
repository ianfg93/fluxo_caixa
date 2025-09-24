"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

interface CashFlowChartProps {
  data: Array<{
    month: string
    entries: number
    exits: number
    balance: number
  }>
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxo de Caixa Mensal</CardTitle>
        <CardDescription>Comparativo de entradas e saídas dos últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number) => [formatCurrency(value), ""]} labelStyle={{ color: "#000" }} />
              <Legend />
              <Bar dataKey="entries" fill="#22c55e" name="Entradas" />
              <Bar dataKey="exits" fill="#ef4444" name="Saídas" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
