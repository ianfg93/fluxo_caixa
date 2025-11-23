"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CashRegisterService, type PeriodReport } from "@/lib/cash-register"
import { FileText, Printer, Calendar, DollarSign, TrendingUp, TrendingDown } from "lucide-react"

interface PeriodReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PeriodType = '' | 'custom' | 'week' | 'month' | 'quarter' | 'year'

export function PeriodReportDialog({ open, onOpenChange }: PeriodReportDialogProps) {
  const [report, setReport] = useState<PeriodReport | null>(null)
  const [periodType, setPeriodType] = useState<PeriodType>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const getTodayBrazil = () => {
    const now = new Date()
    const brazilDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const year = brazilDate.getFullYear()
    const month = String(brazilDate.getMonth() + 1).padStart(2, '0')
    const day = String(brazilDate.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getDateRange = (type: PeriodType): { start: string; end: string } => {
    const now = new Date()
    const brazilDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
    const year = brazilDate.getFullYear()
    const month = brazilDate.getMonth()
    const day = brazilDate.getDate()

    const formatDate = (d: Date) => {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    }

    switch (type) {
      case 'week': {
        const dayOfWeek = brazilDate.getDay()
        const startOfWeek = new Date(year, month, day - dayOfWeek)
        const endOfWeek = new Date(year, month, day + (6 - dayOfWeek))
        return { start: formatDate(startOfWeek), end: formatDate(endOfWeek) }
      }
      case 'month': {
        const startOfMonth = new Date(year, month, 1)
        const endOfMonth = new Date(year, month + 1, 0)
        return { start: formatDate(startOfMonth), end: formatDate(endOfMonth) }
      }
      case 'quarter': {
        const quarterStart = Math.floor(month / 3) * 3
        const startOfQuarter = new Date(year, quarterStart, 1)
        const endOfQuarter = new Date(year, quarterStart + 3, 0)
        return { start: formatDate(startOfQuarter), end: formatDate(endOfQuarter) }
      }
      case 'year': {
        const startOfYear = new Date(year, 0, 1)
        const endOfYear = new Date(year, 11, 31)
        return { start: formatDate(startOfYear), end: formatDate(endOfYear) }
      }
      default:
        return { start: startDate, end: endDate }
    }
  }

  const handlePeriodChange = (type: PeriodType) => {
    setPeriodType(type)
    if (type !== 'custom') {
      const range = getDateRange(type)
      setStartDate(range.start)
      setEndDate(range.end)
    }
  }

  const loadReport = async () => {
    if (!startDate || !endDate) return

    setIsLoading(true)
    const data = await CashRegisterService.getPeriodReport(startDate, endDate)
    setReport(data)
    setIsLoading(false)
    setHasLoaded(true)
  }

  const handlePrint = () => {
    if (!report) return

    const { summary, dailyData, exits, withdrawals } = report

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório por Período - ${formatDateBR(startDate)} a ${formatDateBR(endDate)}</title>
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
          .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
          .summary-box {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 4px;
          }
          .summary-box.green { background: #e8f5e9; border-color: #a5d6a7; }
          .summary-box.red { background: #ffebee; border-color: #ef9a9a; }
          .summary-box.blue { background: #e3f2fd; border-color: #90caf9; }
          .summary-box.orange { background: #fff3e0; border-color: #ffcc80; }
          .summary-label { font-size: 10px; color: #666; margin-bottom: 3px; }
          .summary-value { font-size: 14px; font-weight: bold; }
          .summary-value.green { color: #2e7d32; }
          .summary-value.red { color: #c62828; }
          .summary-value.blue { color: #1565c0; }
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
          .final-balance .value { font-size: 20px; font-weight: bold; }
          .payment-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 8px; }
          .payment-box {
            border: 1px solid #a5d6a7;
            background: #e8f5e9;
            padding: 8px;
            border-radius: 4px;
            text-align: center;
          }
          .daily-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
          .daily-table th, .daily-table td {
            border: 1px solid #ddd;
            padding: 6px 8px;
            text-align: right;
          }
          .daily-table th { background: #f5f5f5; font-weight: bold; text-align: center; }
          .daily-table td:first-child { text-align: left; }
          .daily-table .green { color: #2e7d32; }
          .daily-table .red { color: #c62828; }
          .daily-table .orange { color: #e65100; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .stat-box {
            border: 1px solid #ddd;
            padding: 10px;
            border-radius: 4px;
            text-align: center;
          }
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
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Relatório por Período</h1>
          <p>${formatDateBR(startDate)} a ${formatDateBR(endDate)}</p>
          <p style="margin-top: 5px;">${getPeriodLabel()}</p>
        </div>

        <div class="section">
          <div class="section-title">Resumo do Período</div>
          <div class="summary-grid">
            <div class="summary-box green">
              <div class="summary-label">Total de Entradas</div>
              <div class="summary-value green">+${formatCurrency(summary.totalEntries)}</div>
            </div>
            <div class="summary-box red">
              <div class="summary-label">Total de Saídas</div>
              <div class="summary-value red">-${formatCurrency(summary.totalExits)}</div>
            </div>
            <div class="summary-box orange">
              <div class="summary-label">Total de Sangrias</div>
              <div class="summary-value" style="color: #e65100">-${formatCurrency(summary.totalWithdrawals)}</div>
            </div>
          </div>
          <div class="final-balance">
            <span class="label">Resultado Líquido do Período</span>
            <span class="value" style="color: ${summary.netBalance >= 0 ? '#4caf50' : '#f44336'}">${summary.netBalance >= 0 ? '+' : ''}${formatCurrency(summary.netBalance)}</span>
          </div>
        </div>

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
              <div class="summary-label">Crédito</div>
              <div class="summary-value">${formatCurrency(summary.paymentTotals.credito || 0)}</div>
            </div>
            <div class="payment-box">
              <div class="summary-label">Débito</div>
              <div class="summary-value">${formatCurrency(summary.paymentTotals.debito || 0)}</div>
            </div>
            <div class="payment-box">
              <div class="summary-label">A Prazo</div>
              <div class="summary-value">${formatCurrency(summary.paymentTotals.a_prazo || 0)}</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Estatísticas</div>
          <div class="stats-grid">
            <div class="stat-box">
              <div class="summary-label">Total de Transações</div>
              <div class="summary-value">${report.statistics.totalTransactions}</div>
            </div>
            <div class="stat-box">
              <div class="summary-label">Ticket Médio</div>
              <div class="summary-value">${formatCurrency(report.statistics.averageTicket)}</div>
            </div>
            <div class="stat-box">
              <div class="summary-label">Média Diária (Entradas)</div>
              <div class="summary-value green">${formatCurrency(report.statistics.averageDailyEntries)}</div>
            </div>
            <div class="stat-box">
              <div class="summary-label">Média Diária (Saídas)</div>
              <div class="summary-value red">${formatCurrency(report.statistics.averageDailyExits)}</div>
            </div>
          </div>
        </div>

        ${dailyData.length > 0 ? `
        <div class="section">
          <div class="section-title">Movimentação Diária</div>
          <table class="daily-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Entradas</th>
                <th>Saídas</th>
                <th>Sangrias</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              ${dailyData.map(day => `
              <tr>
                <td>${formatDateBR(day.date)}</td>
                <td class="green">+${formatCurrency(day.entries)}</td>
                <td class="red">-${formatCurrency(day.exits)}</td>
                <td class="orange">-${formatCurrency(day.withdrawals)}</td>
                <td style="font-weight: bold; color: ${day.entries - day.exits - day.withdrawals >= 0 ? '#2e7d32' : '#c62828'}">
                  ${day.entries - day.exits - day.withdrawals >= 0 ? '+' : ''}${formatCurrency(day.entries - day.exits - day.withdrawals)}
                </td>
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

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }

  const formatCurrency = (value: number) => {
    return CashRegisterService.formatCurrency(value)
  }

  const formatDateBR = (dateString: string) => {
    if (!dateString) return ''
    const [year, month, day] = dateString.split('-')
    return `${day}/${month}/${year}`
  }

  const getPeriodLabel = () => {
    switch (periodType) {
      case 'week': return 'Semana Atual'
      case 'month': return 'Mês Atual'
      case 'quarter': return 'Trimestre Atual'
      case 'year': return 'Ano Atual'
      case 'custom': return 'Período Personalizado'
      default: return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[95vw] !max-w-[95vw] !h-[95vh] !max-h-[95vh] overflow-y-auto">
        {/* Cabeçalho */}
        <DialogHeader className="space-y-3 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-purple-700" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-2xl">Relatório por Período</DialogTitle>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                  Análise consolidada de movimentações
                </p>
              </div>
            </div>
            {report && (
              <Button onClick={handlePrint} variant="outline" size="sm" className="w-full sm:w-auto">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            )}
          </div>

          {/* Seleção de período */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Tipo de Período</Label>
              <Select value={periodType} onValueChange={(v) => handlePeriodChange(v as PeriodType)}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Semana Atual</SelectItem>
                  <SelectItem value="month">Mês Atual</SelectItem>
                  <SelectItem value="quarter">Trimestre Atual</SelectItem>
                  <SelectItem value="year">Ano Atual</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data Inicial</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setPeriodType('custom')
                }}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data Final</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setPeriodType('custom')
                }}
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">&nbsp;</Label>
              <Button onClick={loadReport} disabled={!startDate || !endDate || isLoading} className="w-full h-10">
                {isLoading ? 'Carregando...' : 'Gerar Relatório'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <p>Carregando relatório...</p>
          </div>
        )}

        {!isLoading && !hasLoaded && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Selecione um período e clique em "Gerar Relatório"</p>
          </div>
        )}

        {!isLoading && hasLoaded && !report && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">Nenhum dado encontrado para o período selecionado</p>
          </div>
        )}

        {!isLoading && report && (
          <div className="space-y-6 py-4">
            {/* Resumo Principal */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-xs sm:text-sm text-slate-700 uppercase tracking-wide">
                Resumo do Período
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-3 sm:p-5">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                    <p className="text-[10px] sm:text-xs font-medium text-green-700">Total de Entradas</p>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-green-900">+{formatCurrency(report.summary.totalEntries)}</p>
                </div>

                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-3 sm:p-5">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-600" />
                    <p className="text-[10px] sm:text-xs font-medium text-red-700">Total de Saídas</p>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-red-900">-{formatCurrency(report.summary.totalExits)}</p>
                </div>

                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-3 sm:p-5 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                    <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-orange-600" />
                    <p className="text-[10px] sm:text-xs font-medium text-orange-700">Total de Sangrias</p>
                  </div>
                  <p className="text-lg sm:text-2xl font-bold text-orange-900">-{formatCurrency(report.summary.totalWithdrawals)}</p>
                </div>
              </div>

              {/* Resultado Líquido */}
              <div className={`rounded-xl p-4 sm:p-6 text-white ${report.summary.netBalance >= 0 ? 'bg-gradient-to-r from-green-600 to-green-700' : 'bg-gradient-to-r from-red-600 to-red-700'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                  <div>
                    <p className="text-xs sm:text-sm opacity-90">Resultado Líquido do Período</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-2xl sm:text-4xl font-bold">
                      {report.summary.netBalance >= 0 ? '+' : ''}{formatCurrency(report.summary.netBalance)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Vendas por Forma de Pagamento */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-xs sm:text-sm text-slate-700 uppercase tracking-wide">Vendas por Forma de Pagamento</h3>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
                {['dinheiro', 'pix', 'credito', 'debito', 'a_prazo'].map((method) => (
                  <div key={method} className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 text-center">
                    <p className="text-[10px] sm:text-xs font-medium text-green-700 mb-1">
                      {CashRegisterService.getPaymentMethodLabel(method)}
                    </p>
                    <p className="text-xs sm:text-lg font-bold text-green-900">
                      {formatCurrency(report.summary.paymentTotals[method] || 0)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Estatísticas */}
            <div className="space-y-3 sm:space-y-4">
              <h3 className="font-semibold text-xs sm:text-sm text-slate-700 uppercase tracking-wide">Estatísticas</h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Transações</p>
                  <p className="text-lg sm:text-xl font-bold">{report.statistics.totalTransactions}</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
                  <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Ticket Médio</p>
                  <p className="text-sm sm:text-lg font-bold">{formatCurrency(report.statistics.averageTicket)}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-[10px] sm:text-xs text-green-700 mb-1">Média Diária (Entradas)</p>
                  <p className="text-sm sm:text-lg font-bold text-green-900">{formatCurrency(report.statistics.averageDailyEntries)}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                  <p className="text-[10px] sm:text-xs text-red-700 mb-1">Média Diária (Saídas)</p>
                  <p className="text-sm sm:text-lg font-bold text-red-900">{formatCurrency(report.statistics.averageDailyExits)}</p>
                </div>
              </div>
            </div>

            {/* Movimentação Diária */}
            {report.dailyData.length > 0 && (
              <div className="space-y-3 sm:space-y-4">
                <h3 className="font-semibold text-xs sm:text-sm text-slate-700 uppercase tracking-wide">
                  Movimentação Diária ({report.dailyData.length} dias)
                </h3>

                <div className="bg-slate-50 rounded-lg p-3 sm:p-4 overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-2 sm:px-3 font-semibold">Data</th>
                        <th className="text-right py-2 px-2 sm:px-3 font-semibold text-green-700">Entradas</th>
                        <th className="text-right py-2 px-2 sm:px-3 font-semibold text-red-700">Saídas</th>
                        <th className="text-right py-2 px-2 sm:px-3 font-semibold text-orange-700">Sangrias</th>
                        <th className="text-right py-2 px-2 sm:px-3 font-semibold">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.dailyData.map((day) => {
                        const balance = day.entries - day.exits - day.withdrawals
                        return (
                          <tr key={day.date} className="border-b border-slate-100">
                            <td className="py-2 px-2 sm:px-3">{formatDateBR(day.date)}</td>
                            <td className="py-2 px-2 sm:px-3 text-right text-green-600 font-medium">
                              +{formatCurrency(day.entries)}
                            </td>
                            <td className="py-2 px-2 sm:px-3 text-right text-red-600 font-medium">
                              -{formatCurrency(day.exits)}
                            </td>
                            <td className="py-2 px-2 sm:px-3 text-right text-orange-600 font-medium">
                              -{formatCurrency(day.withdrawals)}
                            </td>
                            <td className={`py-2 px-2 sm:px-3 text-right font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Info sobre sessões de caixa */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
                <div>
                  <span className="text-blue-700">Dias com caixa aberto:</span>
                  <span className="font-bold ml-1">{report.summary.daysWithSessions}</span>
                </div>
                <div>
                  <span className="text-green-700">Caixas fechados:</span>
                  <span className="font-bold ml-1">{report.summary.daysClosed}</span>
                </div>
                {report.summary.daysOpen > 0 && (
                  <div>
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                      {report.summary.daysOpen} caixa(s) ainda aberto(s)
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
