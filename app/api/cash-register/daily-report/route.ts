import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

// GET - Relatório diário completo
export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)

    // Converte para o timezone de Brasília
    const getTodayBrazil = () => {
      const now = new Date()
      const brazilDate = new Date(now.toLocaleString('en-US', {
        timeZone: 'America/Sao_Paulo'
      }))

      const year = brazilDate.getFullYear()
      const month = String(brazilDate.getMonth() + 1).padStart(2, '0')
      const day = String(brazilDate.getDate()).padStart(2, '0')

      return `${year}-${month}-${day}`
    }

    const date = searchParams.get("date") || getTodayBrazil()

    // 1. Buscar sessão de caixa do dia
    const sessionResult = await query(
      `SELECT
        crs.*,
        u1.name as opened_by_name,
        u2.name as closed_by_name
       FROM cash_register_sessions crs
       LEFT JOIN users u1 ON crs.opened_by = u1.id
       LEFT JOIN users u2 ON crs.closed_by = u2.id
       WHERE crs.company_id = $1::uuid
       AND crs.opening_date = $2::date
       ORDER BY crs.opening_time DESC
       LIMIT 1`,
      [user.companyId, date]
    )

    const cashSession = sessionResult.rows.length > 0 ? {
      id: sessionResult.rows[0].id,
      openingAmount: parseFloat(sessionResult.rows[0].opening_amount),
      closingAmount: sessionResult.rows[0].closing_amount ? parseFloat(sessionResult.rows[0].closing_amount) : null,
      expectedAmount: sessionResult.rows[0].expected_amount ? parseFloat(sessionResult.rows[0].expected_amount) : null,
      difference: sessionResult.rows[0].difference ? parseFloat(sessionResult.rows[0].difference) : null,
      status: sessionResult.rows[0].status,
      openingTime: sessionResult.rows[0].opening_time,
      closingTime: sessionResult.rows[0].closing_time,
      openedBy: sessionResult.rows[0].opened_by_name,
      closedBy: sessionResult.rows[0].closed_by_name,
      openingNotes: sessionResult.rows[0].opening_notes,
      closingNotes: sessionResult.rows[0].closing_notes,
    } : null

    // 2. Buscar todas as entradas do dia
    const entriesResult = await query(
      `SELECT
        cft.id,
        cft.description,
        cft.amount,
        cft.payment_method,
        cft.payment_splits,
        cft.notes,
        cft.created_at,
        u.name as created_by_name
       FROM cash_flow_transactions cft
       LEFT JOIN users u ON cft.created_by = u.id
       WHERE cft.company_id = $1::uuid
       AND cft.type = 'entry'
       AND cft.transaction_date = $2::date
       ORDER BY cft.created_at DESC`,
      [user.companyId, date]
    )

    // 3. Buscar todas as saídas do dia
    const exitsResult = await query(
      `SELECT
        cft.id,
        cft.description,
        cft.amount,
        cft.payment_method,
        cft.notes,
        cft.created_at,
        u.name as created_by_name
       FROM cash_flow_transactions cft
       LEFT JOIN users u ON cft.created_by = u.id
       WHERE cft.company_id = $1::uuid
       AND cft.type = 'exit'
       AND cft.transaction_date = $2::date
       ORDER BY cft.created_at DESC`,
      [user.companyId, date]
    )

    // 4. Buscar sangrias do dia
    const withdrawalsResult = await query(
      `SELECT
        cw.id,
        cw.amount,
        cw.withdrawal_time,
        cw.reason,
        cw.notes,
        u.name as withdrawn_by_name
       FROM cash_withdrawals cw
       LEFT JOIN users u ON cw.withdrawn_by = u.id
       WHERE cw.company_id = $1::uuid
       AND cw.withdrawal_date = $2::date
       ORDER BY cw.withdrawal_time DESC`,
      [user.companyId, date]
    )

    // 4. Calcular totais por forma de pagamento
    const paymentTotals: Record<string, number> = {
      dinheiro: 0,
      pix: 0,
      credito: 0,
      debito: 0,
      a_prazo: 0,
      multiplas: 0,
    }

    let totalEntries = 0
    const entries = entriesResult.rows.map((row) => {
      const amount = parseFloat(row.amount)
      totalEntries += amount

      // Processar payment_splits se existir
      let paymentSplits = null
      if (row.payment_splits) {
        try {
          paymentSplits = typeof row.payment_splits === 'string'
            ? JSON.parse(row.payment_splits)
            : row.payment_splits

          // Somar nos totais de cada método
          if (Array.isArray(paymentSplits)) {
            paymentSplits.forEach((split: any) => {
              if (split.paymentMethod && split.amount) {
                paymentTotals[split.paymentMethod] = (paymentTotals[split.paymentMethod] || 0) + parseFloat(split.amount)
              }
            })
            // Não adicionar ao multiplas porque os valores já foram somados individualmente
          }
        } catch (error) {
          console.error('Erro ao parsear payment_splits:', error)
        }
      } else if (row.payment_method) {
        // Pagamento único
        paymentTotals[row.payment_method] = (paymentTotals[row.payment_method] || 0) + amount
      }

      return {
        id: row.id,
        description: row.description,
        amount,
        paymentMethod: row.payment_method,
        paymentSplits,
        notes: row.notes,
        createdBy: row.created_by_name,
        createdAt: row.created_at,
      }
    })

    let totalExits = 0
    const exits = exitsResult.rows.map((row) => {
      const amount = parseFloat(row.amount)
      totalExits += amount

      return {
        id: row.id,
        description: row.description,
        amount,
        paymentMethod: row.payment_method,
        notes: row.notes,
        createdBy: row.created_by_name,
        createdAt: row.created_at,
      }
    })

    // Processar sangrias
    let totalWithdrawals = 0
    const withdrawals = withdrawalsResult.rows.map((row) => {
      const amount = parseFloat(row.amount)
      totalWithdrawals += amount

      return {
        id: row.id,
        amount,
        withdrawalTime: row.withdrawal_time,
        reason: row.reason,
        notes: row.notes,
        withdrawnBy: row.withdrawn_by_name,
      }
    })

    // 5. Calcular saldo final (considerando sangrias)
    const openingAmount = cashSession?.openingAmount || 0
    const finalBalance = openingAmount + totalEntries - totalExits - totalWithdrawals

    // 6. Montar relatório
    const report = {
      date,
      cashSession,
      summary: {
        openingAmount,
        totalEntries,
        totalExits,
        totalWithdrawals,
        finalBalance,
        paymentTotals,
      },
      entries,
      exits,
      withdrawals,
      statistics: {
        totalTransactions: entries.length + exits.length,
        averageTicket: entries.length > 0 ? totalEntries / entries.length : 0,
      },
    }

    return NextResponse.json({ report })
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    return NextResponse.json({ error: "Erro ao gerar relatório" }, { status: 500 })
  }
}
