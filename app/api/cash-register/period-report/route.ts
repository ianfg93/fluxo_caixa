import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

// GET - Relatório por período
export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Data inicial e final são obrigatórias" }, { status: 400 })
    }

    // 1. Buscar todas as sessões de caixa do período
    const sessionsResult = await query(
      `SELECT
        crs.*,
        u1.name as opened_by_name,
        u2.name as closed_by_name
       FROM cash_register_sessions crs
       LEFT JOIN users u1 ON crs.opened_by = u1.id
       LEFT JOIN users u2 ON crs.closed_by = u2.id
       WHERE crs.company_id = $1::uuid
       AND crs.opening_date >= $2::date
       AND crs.opening_date <= $3::date
       ORDER BY crs.opening_date ASC`,
      [user.companyId, startDate, endDate]
    )

    const sessions = sessionsResult.rows.map(row => ({
      id: row.id,
      openingDate: row.opening_date,
      openingAmount: parseFloat(row.opening_amount),
      closingAmount: row.closing_amount ? parseFloat(row.closing_amount) : null,
      expectedAmount: row.expected_amount ? parseFloat(row.expected_amount) : null,
      difference: row.difference ? parseFloat(row.difference) : null,
      status: row.status,
      openingTime: row.opening_time,
      closingTime: row.closing_time,
      openedBy: row.opened_by_name,
      closedBy: row.closed_by_name,
    }))

    // 2. Buscar todas as entradas do período
    const entriesResult = await query(
      `SELECT
        cft.id,
        cft.description,
        cft.amount,
        cft.payment_method,
        cft.payment_splits,
        cft.transaction_date,
        cft.notes,
        cft.created_at,
        u.name as created_by_name
       FROM cash_flow_transactions cft
       LEFT JOIN users u ON cft.created_by = u.id
       WHERE cft.company_id = $1::uuid
       AND cft.type = 'entry'
       AND cft.transaction_date >= $2::date
       AND cft.transaction_date <= $3::date
       ORDER BY cft.transaction_date ASC, cft.created_at ASC`,
      [user.companyId, startDate, endDate]
    )

    // 3. Buscar todas as saídas do período
    const exitsResult = await query(
      `SELECT
        cft.id,
        cft.description,
        cft.amount,
        cft.payment_method,
        cft.transaction_date,
        cft.notes,
        cft.created_at,
        u.name as created_by_name
       FROM cash_flow_transactions cft
       LEFT JOIN users u ON cft.created_by = u.id
       WHERE cft.company_id = $1::uuid
       AND cft.type = 'exit'
       AND cft.transaction_date >= $2::date
       AND cft.transaction_date <= $3::date
       ORDER BY cft.transaction_date ASC, cft.created_at ASC`,
      [user.companyId, startDate, endDate]
    )

    // 4. Buscar sangrias do período
    const withdrawalsResult = await query(
      `SELECT
        cw.id,
        cw.amount,
        cw.withdrawal_date,
        cw.withdrawal_time,
        cw.reason,
        cw.notes,
        u.name as withdrawn_by_name
       FROM cash_withdrawals cw
       LEFT JOIN users u ON cw.withdrawn_by = u.id
       WHERE cw.company_id = $1::uuid
       AND cw.withdrawal_date >= $2::date
       AND cw.withdrawal_date <= $3::date
       ORDER BY cw.withdrawal_date ASC, cw.withdrawal_time ASC`,
      [user.companyId, startDate, endDate]
    )

    // 5. Calcular totais por forma de pagamento
    const paymentTotals: Record<string, number> = {
      dinheiro: 0,
      pix: 0,
      credito: 0,
      debito: 0,
      a_prazo: 0,
    }

    // Totais por dia para gráfico
    const dailyTotals: Record<string, { date: string, entries: number, exits: number, withdrawals: number }> = {}

    let totalEntries = 0
    const entries = entriesResult.rows.map((row) => {
      const amount = parseFloat(row.amount)
      totalEntries += amount
      const dateKey = row.transaction_date.toISOString().split('T')[0]

      // Inicializar dia se não existir
      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { date: dateKey, entries: 0, exits: 0, withdrawals: 0 }
      }
      dailyTotals[dateKey].entries += amount

      // Processar payment_splits se existir
      let paymentSplits = null
      if (row.payment_splits) {
        try {
          paymentSplits = typeof row.payment_splits === 'string'
            ? JSON.parse(row.payment_splits)
            : row.payment_splits

          if (Array.isArray(paymentSplits)) {
            paymentSplits.forEach((split: any) => {
              if (split.paymentMethod && split.amount) {
                paymentTotals[split.paymentMethod] = (paymentTotals[split.paymentMethod] || 0) + parseFloat(split.amount)
              }
            })
          }
        } catch (error) {
          console.error('Erro ao parsear payment_splits:', error)
        }
      } else if (row.payment_method) {
        paymentTotals[row.payment_method] = (paymentTotals[row.payment_method] || 0) + amount
      }

      return {
        id: row.id,
        description: row.description,
        amount,
        paymentMethod: row.payment_method,
        transactionDate: row.transaction_date,
        notes: row.notes,
        createdBy: row.created_by_name,
        createdAt: row.created_at,
      }
    })

    let totalExits = 0
    let totalExitsCash = 0
    const exits = exitsResult.rows.map((row) => {
      const amount = parseFloat(row.amount)
      totalExits += amount
      const dateKey = row.transaction_date.toISOString().split('T')[0]

      if (row.payment_method === 'dinheiro') {
        totalExitsCash += amount
      }

      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { date: dateKey, entries: 0, exits: 0, withdrawals: 0 }
      }
      dailyTotals[dateKey].exits += amount

      return {
        id: row.id,
        description: row.description,
        amount,
        paymentMethod: row.payment_method,
        transactionDate: row.transaction_date,
        notes: row.notes,
        createdBy: row.created_by_name,
        createdAt: row.created_at,
      }
    })

    let totalWithdrawals = 0
    const withdrawals = withdrawalsResult.rows.map((row) => {
      const amount = parseFloat(row.amount)
      totalWithdrawals += amount
      const dateKey = row.withdrawal_date.toISOString().split('T')[0]

      if (!dailyTotals[dateKey]) {
        dailyTotals[dateKey] = { date: dateKey, entries: 0, exits: 0, withdrawals: 0 }
      }
      dailyTotals[dateKey].withdrawals += amount

      return {
        id: row.id,
        amount,
        withdrawalDate: row.withdrawal_date,
        withdrawalTime: row.withdrawal_time,
        reason: row.reason,
        notes: row.notes,
        withdrawnBy: row.withdrawn_by_name,
      }
    })

    // 6. Calcular totais de abertura do período
    const totalOpeningAmount = sessions.reduce((sum, s) => sum + s.openingAmount, 0)
    const totalClosingAmount = sessions.filter(s => s.closingAmount !== null).reduce((sum, s) => sum + (s.closingAmount || 0), 0)
    const totalDifference = sessions.filter(s => s.difference !== null).reduce((sum, s) => sum + (s.difference || 0), 0)

    // 7. Calcular dinheiro esperado em caixa
    const cashInHand = (paymentTotals.dinheiro || 0) - totalWithdrawals - totalExitsCash

    // 8. Montar relatório
    const report = {
      startDate,
      endDate,
      sessions,
      summary: {
        totalOpeningAmount,
        totalClosingAmount,
        totalDifference,
        totalEntries,
        totalExits,
        totalWithdrawals,
        netBalance: totalEntries - totalExits,
        cashInHand,
        paymentTotals,
        daysWithSessions: sessions.length,
        daysOpen: sessions.filter(s => s.status === 'open').length,
        daysClosed: sessions.filter(s => s.status === 'closed').length,
      },
      dailyData: Object.values(dailyTotals).sort((a, b) => a.date.localeCompare(b.date)),
      entries,
      exits,
      withdrawals,
      statistics: {
        totalTransactions: entries.length + exits.length,
        averageTicket: entries.length > 0 ? totalEntries / entries.length : 0,
        averageDailyEntries: Object.keys(dailyTotals).length > 0 ? totalEntries / Object.keys(dailyTotals).length : 0,
        averageDailyExits: Object.keys(dailyTotals).length > 0 ? totalExits / Object.keys(dailyTotals).length : 0,
      },
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Erro ao gerar relatório por período:', error)
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 })
  }
}
