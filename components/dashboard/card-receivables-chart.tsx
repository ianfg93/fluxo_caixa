"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from "recharts"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

interface CardReceivablesChartProps {
  data: Array<{
    date: string
    debit: number
    credit: number
    total: number
    fees: number
  }>
}

export function CardReceivablesChart({ data }: CardReceivablesChartProps) {
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
      <CardHeader className="p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg md:text-xl">Recebíveis de Cartão</CardTitle>
            <CardDescription className="text-xs md:text-sm">Projeção de valores a receber por período</CardDescription>
          </div>
          <Link href="/card-receivables" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
            Ver detalhes
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-4 md:p-6 pt-0">
        <div className="h-64 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
                width={80}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), ""]}
                labelStyle={{ color: "#000" }}
                contentStyle={{ fontSize: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="debit" fill="#3b82f6" name="Débito" stackId="a" />
              <Bar dataKey="credit" fill="#a855f7" name="Crédito" stackId="a" />
              <Line
                type="monotone"
                dataKey="fees"
                stroke="#ef4444"
                name="Taxas"
                strokeWidth={2}
                dot={{ fill: "#ef4444", r: 3 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
