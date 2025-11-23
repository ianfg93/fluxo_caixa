"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CashRegisterService, type DailyReport } from "@/lib/cash-register"
import { FileText, Printer, Calendar, DollarSign } from "lucide-react"
import { getTodayBrazil } from "@/lib/utils"

interface DailyReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseRegister?: () => void
}

export function DailyReportDialog({ open, onOpenChange, onCloseRegister }: DailyReportDialogProps) {
  const [report, setReport] = useState<DailyReport | null>(null)
  const [selectedDate, setSelectedDate] = useState(getTodayBrazil())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadReport()
    }
  }, [open, selectedDate])

  const loadReport = async () => {
    setIsLoading(true)
    const data = await CashRegisterService.getDailyReport(selectedDate)
    setReport(data)
    setIsLoading(false)
  }

  const handlePrint = () => {
    if (!report) return

    const { cashSession, summary, exits, withdrawals } = report
    // Calcular saídas pagas em dinheiro
    const exitsCashTotal = exits
      .filter((exit: any) => exit.paymentMethod === 'dinheiro')
      .reduce((sum: number, exit: any) => sum + exit.amount, 0)
    const cashInHand = summary.openingAmount + (summary.paymentTotals.dinheiro || 0) - (summary.totalWithdrawals || 0) - exitsCashTotal

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório de Caixa - ${formatDate(selectedDate)}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            font-size: 12px;
            color: #333;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
            margin-bottom: 20px;
          }
          .header h1 { font-size: 18px; margin-bottom: 5px; }
          .header p { color: #666; font-size: 11px; }
          .section { margin-bottom: 20px; }
          .section-title {
            font-size: 13px;
            font-weight: bold;
            text-transform: uppercase;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
            margin-bottom: 10px;
            color: #444;
          }
          .info-grid { display: flex; gap: 20px; margin-bottom: 10px; }
          .info-item { flex: 1; }
          .info-label { font-size: 10px; color: #666; margin-bottom: 2px; }
          .info-value { font-size: 12px; font-weight: bold; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .summary-box {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 4px;
          }
          .summary-box.blue { background: #e3f2fd; border-color: #90caf9; }
          .summary-box.green { background: #e8f5e9; border-color: #a5d6a7; }
          .summary-box.red { background: #ffebee; border-color: #ef9a9a; }
          .summary-box.orange { background: #fff3e0; border-color: #ffcc80; }
          .summary-label { font-size: 10px; color: #666; margin-bottom: 3px; }
          .summary-value { font-size: 16px; font-weight: bold; }
          .summary-value.green { color: #2e7d32; }
          .summary-value.red { color: #c62828; }
          .summary-value.orange { color: #e65100; }
          .final-balance {
            background: #263238;
            color: white;
            padding: 15px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
          }
          .final-balance .label { font-size: 12px; }
          .final-balance .value { font-size: 22px; font-weight: bold; }
          .cash-expected {
            background: #2e7d32;
            color: white;
            padding: 15px;
            border-radius: 4px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 10px;
          }
          .payment-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 8px; }
          .payment-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .payment-box {
            border: 1px solid #a5d6a7;
            background: #e8f5e9;
            padding: 8px;
            border-radius: 4px;
          }
          .movement-table { width: 100%; border-collapse: collapse; font-size: 11px; }
          .movement-table th, .movement-table td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: left;
          }
          .movement-table th { background: #f5f5f5; font-weight: bold; }
          .movement-table .amount { text-align: right; font-weight: bold; }
          .movement-table .amount.red { color: #c62828; }
          .movement-table .amount.orange { color: #e65100; }
          .closing-section {
            border: 2px solid #ddd;
            padding: 15px;
            border-radius: 4px;
            margin-top: 15px;
          }
          .closing-section.ok { background: #e8f5e9; border-color: #4caf50; }
          .closing-section.over { background: #e3f2fd; border-color: #2196f3; }
          .closing-section.under { background: #fff3e0; border-color: #ff9800; }
          .closing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: bold;
          }
          .badge.open { background: #4caf50; color: white; }
          .badge.closed { background: #9e9e9e; color: white; }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ccc;
            text-align: center;
            font-size: 10px;
            color: #999;
          }
          @media print {
            body { padding: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório de Caixa</h1>
          <p>${formatDate(selectedDate)}</p>
          ${cashSession ? `<span class="badge ${cashSession.status}">${cashSession.status === 'open' ? 'Caixa Aberto' : 'Caixa Fechado'}</span>` : ''}
        </div>

        ${cashSession ? `
        <div class="section">
          <div class="section-title">Informações do Caixa</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Abertura</div>
              <div class="info-value">${formatTime(cashSession.openingTime)} - ${cashSession.openedBy}</div>
            </div>
            ${cashSession.closingTime ? `
            <div class="info-item">
              <div class="info-label">Fechamento</div>
              <div class="info-value">${formatTime(cashSession.closingTime)} - ${cashSession.closedBy}</div>
            </div>
            ` : ''}
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Resumo Financeiro</div>
          <div class="summary-grid">
            <div class="summary-box blue">
              <div class="summary-label">Valor de Abertura</div>
              <div class="summary-value">${formatCurrency(summary.openingAmount)}</div>
            </div>
            <div class="summary-box green">
              <div class="summary-label">Total de Vendas</div>
              <div class="summary-value green">+${formatCurrency(summary.totalEntries)}</div>
            </div>
            <div class="summary-box red">
              <div class="summary-label">Total de Saídas</div>
              <div class="summary-value red">-${formatCurrency(summary.totalExits)}</div>
            </div>
            <div class="summary-box orange">
              <div class="summary-label">Total de Sangrias</div>
              <div class="summary-value orange">-${formatCurrency(summary.totalWithdrawals || 0)}</div>
            </div>
          </div>
          <div class="final-balance">
            <span class="label">Saldo Final do Caixa</span>
            <span class="value">${formatCurrency(summary.finalBalance)}</span>
          </div>
        </div>

        ${cashSession?.status === 'closed' && cashSession.difference !== undefined ? `
        <div class="section">
          <div class="section-title">Conferência de Fechamento</div>
          <div class="closing-section ${Math.abs(cashSession.difference) < 0.01 ? 'ok' : cashSession.difference > 0 ? 'over' : 'under'}">
            <div class="closing-grid">
              <div>
                <div class="info-label">Valor Esperado</div>
                <div class="info-value">${formatCurrency(cashSession.expectedAmount || 0)}</div>
              </div>
              <div>
                <div class="info-label">Valor Contado</div>
                <div class="info-value">${formatCurrency(cashSession.closingAmount || 0)}</div>
              </div>
              <div style="text-align: right;">
                <div class="info-label">${Math.abs(cashSession.difference) < 0.01 ? 'Conferido' : cashSession.difference > 0 ? 'Sobra' : 'Falta'}</div>
                <div class="info-value" style="color: ${Math.abs(cashSession.difference) < 0.01 ? '#2e7d32' : cashSession.difference > 0 ? '#1565c0' : '#e65100'}">
                  ${cashSession.difference > 0 ? '+' : ''}${formatCurrency(cashSession.difference)}
                </div>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Vendas por Forma de Pagamento</div>
          <div class="payment-grid">
            <div class="payment-box">
              <div class="summary-label">Dinheiro</div>
              <div class="summary-value">${formatCurrency(summary.paymentTotals.dinheiro || 0)}</div>
            </div>
            <div class="payment-box">
              <div class="summary-label">PIX</div>
              <div class="summary-value">${formatCurrency(summary.paymentTotals.pix || 0)}</div>
            </div>
            <div class="payment-box">
              <div class="summary-label">A Prazo</div>
              <div class="summary-value">${formatCurrency(summary.paymentTotals.a_prazo || 0)}</div>
            </div>
          </div>
          <div class="payment-grid-2">
            <div class="payment-box">
              <div class="summary-label">Crédito</div>
              <div class="summary-value">${formatCurrency(summary.paymentTotals.credito || 0)}</div>
            </div>
            <div class="payment-box">
              <div class="summary-label">Débito</div>
              <div class="summary-value">${formatCurrency(summary.paymentTotals.debito || 0)}</div>
            </div>
          </div>
          <div class="cash-expected">
            <span class="label">Dinheiro Esperado no Caixa</span>
            <span class="value">${formatCurrency(cashInHand)}</span>
          </div>
        </div>

        ${exits.length > 0 ? `
        <div class="section">
          <div class="section-title">Saídas (${exits.length})</div>
          <table class="movement-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Horário</th>
                <th>Responsável</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${exits.map((exit: any) => `
              <tr>
                <td>${exit.description}</td>
                <td>${formatTime(exit.createdAt)}</td>
                <td>${exit.createdBy}</td>
                <td class="amount red">-${formatCurrency(exit.amount)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${withdrawals.length > 0 ? `
        <div class="section">
          <div class="section-title">Sangrias (${withdrawals.length})</div>
          <table class="movement-table">
            <thead>
              <tr>
                <th>Motivo</th>
                <th>Observações</th>
                <th>Horário</th>
                <th>Responsável</th>
                <th style="text-align: right;">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${withdrawals.map((withdrawal: any) => `
              <tr>
                <td>${withdrawal.reason}</td>
                <td>${withdrawal.notes || '-'}</td>
                <td>${formatTime(withdrawal.withdrawalTime)}</td>
                <td>${withdrawal.withdrawnBy}</td>
                <td class="amount orange">-${formatCurrency(withdrawal.amount)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          Relatório gerado em ${new Date().toLocaleString('pt-BR')}
        </div>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  const formatCurrency = (value: number) => {
    return CashRegisterService.formatCurrency(value)
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <p>Carregando relatório...</p>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!report) {
    return null
  }

  const { cashSession, summary, exits, withdrawals } = report

  // Calcular valor esperado em dinheiro físico
  // Considera: abertura + entradas em dinheiro - sangrias - saídas pagas em dinheiro
  const exitsCashTotal = exits
    .filter((exit: any) => exit.paymentMethod === 'dinheiro')
    .reduce((sum: number, exit: any) => sum + exit.amount, 0)
  const cashInHand = summary.openingAmount + (summary.paymentTotals.dinheiro || 0) - (summary.totalWithdrawals || 0) - exitsCashTotal

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[95vw] !max-w-[95vw] !h-[95vh] !max-h-[95vh] overflow-y-auto">
        {/* Cabeçalho */}
        <DialogHeader className="space-y-4 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Relatório de Caixa</DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {formatDate(selectedDate)}
                </p>
              </div>
            </div>
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-48"
            />
            {cashSession && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <Badge variant={cashSession.status === 'open' ? 'default' : 'secondary'}>
                  {cashSession.status === 'open' ? 'Caixa Aberto' : 'Caixa Fechado'}
                </Badge>
              </>
            )}
          </div>
        </DialogHeader>

        <Separator />

        <div className="space-y-8 py-4">
          {/* Informações de Abertura */}
          {cashSession && (
            <div className="bg-slate-50 rounded-lg p-5 space-y-3">
              <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">Informações do Caixa</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Abertura</p>
                  <p className="text-sm font-medium">
                    {formatTime(cashSession.openingTime)} - {cashSession.openedBy}
                  </p>
                </div>
                {cashSession.closingTime && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Fechamento</p>
                    <p className="text-sm font-medium">
                      {formatTime(cashSession.closingTime)} - {cashSession.closedBy}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Resumo Financeiro */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">Resumo Financeiro</h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Abertura */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
                <p className="text-xs font-medium text-blue-700 mb-2">Valor de Abertura</p>
                <p className="text-3xl font-bold text-blue-900">{formatCurrency(summary.openingAmount)}</p>
              </div>

              {/* Vendas */}
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
                <p className="text-xs font-medium text-green-700 mb-2">Total de Vendas</p>
                <p className="text-3xl font-bold text-green-900">+{formatCurrency(summary.totalEntries)}</p>
              </div>

              {/* Saídas */}
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5">
                <p className="text-xs font-medium text-red-700 mb-2">Total de Saídas</p>
                <p className="text-3xl font-bold text-red-900">-{formatCurrency(summary.totalExits)}</p>
              </div>

              {/* Sangrias */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5">
                <p className="text-xs font-medium text-orange-700 mb-2">Total de Sangrias</p>
                <p className="text-3xl font-bold text-orange-900">-{formatCurrency(summary.totalWithdrawals || 0)}</p>
              </div>
            </div>

            {/* Saldo Final em Destaque */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm opacity-90 mb-1">Saldo Final do Caixa</p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold">{formatCurrency(summary.finalBalance)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Diferença de Fechamento */}
          {cashSession?.status === 'closed' && cashSession.difference !== undefined && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">Conferência de Fechamento</h3>

              <div className={`rounded-xl p-6 border-2 ${
                Math.abs(cashSession.difference) < 0.01
                  ? 'bg-green-50 border-green-300'
                  : cashSession.difference > 0
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-orange-50 border-orange-300'
              }`}>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valor Esperado</p>
                    <p className="text-2xl font-bold">{formatCurrency(cashSession.expectedAmount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Valor Contado</p>
                    <p className="text-2xl font-bold">{formatCurrency(cashSession.closingAmount || 0)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-1">
                      {Math.abs(cashSession.difference) < 0.01 ? 'Conferido' : cashSession.difference > 0 ? 'Sobra' : 'Falta'}
                    </p>
                    <p className={`text-2xl font-bold ${
                      Math.abs(cashSession.difference) < 0.01
                        ? 'text-green-600'
                        : cashSession.difference > 0
                        ? 'text-blue-600'
                        : 'text-orange-600'
                    }`}>
                      {cashSession.difference > 0 ? '+' : ''}{formatCurrency(cashSession.difference)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Vendas por Forma de Pagamento */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">Vendas por Forma de Pagamento</h3>

            {/* Primeira linha: Dinheiro, PIX, A Prazo */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-green-700">Dinheiro</p>
                </div>
                <p className="text-xl font-bold text-green-900">{formatCurrency(summary.paymentTotals.dinheiro || 0)}</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-green-700">PIX</p>
                </div>
                <p className="text-xl font-bold text-green-900">{formatCurrency(summary.paymentTotals.pix || 0)}</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-green-700">A Prazo</p>
                </div>
                <p className="text-xl font-bold text-green-900">{formatCurrency(summary.paymentTotals.a_prazo || 0)}</p>
              </div>
            </div>

            {/* Segunda linha: Crédito e Débito */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-green-700">Crédito</p>
                </div>
                <p className="text-xl font-bold text-green-900">{formatCurrency(summary.paymentTotals.credito || 0)}</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <p className="text-xs font-medium text-green-700">Débito</p>
                </div>
                <p className="text-xl font-bold text-green-900">{formatCurrency(summary.paymentTotals.debito || 0)}</p>
              </div>
            </div>
          </div>

          {/* Indicador de Dinheiro Esperado em Caixa */}
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90 mb-1 font-medium">Dinheiro Esperado no Caixa</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold">{formatCurrency(cashInHand)}</p>
              </div>
            </div>
          </div>

          {/* Saídas e Sangrias */}
          {(exits.length > 0 || withdrawals.length > 0) && (
            <div className="space-y-4">
              <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-wide">Movimentações</h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Saídas */}
                <div className="bg-slate-50 rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Saídas</h4>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {exits.length}
                    </Badge>
                  </div>

                  {exits.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {exits.map((exit: any) => (
                        <div key={exit.id} className="bg-white border border-slate-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <p className="font-medium text-sm flex-1">{exit.description}</p>
                            <p className="font-bold text-red-600 ml-3">{formatCurrency(exit.amount)}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(exit.createdAt)} • {exit.createdBy}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma saída</p>
                  )}
                </div>

                {/* Sangrias */}
                <div className="bg-slate-50 rounded-lg p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm">Sangrias</h4>
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {withdrawals.length}
                    </Badge>
                  </div>

                  {withdrawals.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                      {withdrawals.map((withdrawal: any) => (
                        <div key={withdrawal.id} className="bg-white border border-slate-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{withdrawal.reason}</p>
                              {withdrawal.notes && (
                                <p className="text-xs text-muted-foreground mt-1">{withdrawal.notes}</p>
                              )}
                            </div>
                            <p className="font-bold text-orange-600 ml-3">{formatCurrency(withdrawal.amount)}</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatTime(withdrawal.withdrawalTime)} • {withdrawal.withdrawnBy}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-6 text-sm">Nenhuma sangria</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Botão de Fechar Caixa */}
          {cashSession?.status === 'open' && onCloseRegister && (
            <div className="pt-4 border-t">
              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg text-red-900 mb-1">Fechar Caixa do Dia</h3>
                    <p className="text-sm text-red-700">
                      O valor esperado em dinheiro no caixa é de <strong>{formatCurrency(cashInHand)}</strong>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Conte o dinheiro físico e confirme o fechamento do caixa.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      onCloseRegister()
                      onOpenChange(false)
                    }}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <DollarSign className="h-5 w-5 mr-2" />
                    Fechar Caixa
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
