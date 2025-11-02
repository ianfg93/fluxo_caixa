"use client"

import { type CardReceivable } from "@/lib/card-receivables"
import { Card, CardContent } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface ReceivablesListProps {
  receivables: CardReceivable[]
}

export function ReceivablesList({ receivables }: ReceivablesListProps) {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("pt-BR")
  }

  const getCardTypeBadge = (type: string) => {
    return type === "debito" ? (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        Débito
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
        Crédito
      </Badge>
    )
  }

  if (receivables.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            Nenhuma transação com cartão encontrada no período selecionado.
          </p>
          <p className="text-center text-sm text-muted-foreground mt-2">
            As transações de entrada pagas com cartão (crédito ou débito) aparecerão aqui automaticamente.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data da Venda</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor Bruto (R$)</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Taxa Aplicada (%)</TableHead>
                <TableHead>Disponível na conta em</TableHead>
                <TableHead>Valor Líquido (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receivables.map((receivable) => (
                <TableRow key={receivable.id}>
                  <TableCell>{formatDate(receivable.transactionDate)}</TableCell>
                  <TableCell>{receivable.description}</TableCell>
                  <TableCell className="capitalize">{receivable.category}</TableCell>
                  <TableCell>{formatCurrency(receivable.grossAmount)}</TableCell>
                  <TableCell>{getCardTypeBadge(receivable.cardType)}</TableCell>
                  <TableCell>{receivable.rateApplied.toFixed(2)}%</TableCell>
                  <TableCell className="font-medium text-blue-600">
                    {formatDate(receivable.settlementDate)}
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    {formatCurrency(receivable.netAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
