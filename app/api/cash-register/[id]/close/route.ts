import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

// POST - Fechar caixa
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { closingAmount, closingNotes } = body

    if (closingAmount === undefined || closingAmount < 0) {
      return NextResponse.json({ error: "Valor de fechamento inválido" }, { status: 400 })
    }

    // Buscar sessão de caixa
    const sessionResult = await query(
      `SELECT * FROM cash_register_sessions
       WHERE id = $1::uuid AND company_id = $2::uuid AND status = 'open'`,
      [params.id, user.companyId]
    )

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: "Caixa não encontrado ou já fechado" }, { status: 404 })
    }

    const session = sessionResult.rows[0]
    const openingAmount = parseFloat(session.opening_amount)

    // Calcular movimentações do dia
    const movementsResult = await query(
      `SELECT
        SUM(CASE WHEN type = 'entry' THEN amount ELSE 0 END) as total_entries,
        SUM(CASE WHEN type = 'exit' THEN amount ELSE 0 END) as total_exits
       FROM cash_flow_transactions
       WHERE company_id = $1::uuid
       AND transaction_date = $2::date`,
      [user.companyId, session.opening_date]
    )

    const totalEntries = parseFloat(movementsResult.rows[0].total_entries || 0)
    const totalExits = parseFloat(movementsResult.rows[0].total_exits || 0)
    const expectedAmount = openingAmount + totalEntries - totalExits
    const difference = closingAmount - expectedAmount

    // Fechar caixa
    const result = await query(
      `UPDATE cash_register_sessions
       SET
         closing_time = NOW(),
         closing_amount = $1,
         expected_amount = $2,
         difference = $3,
         closing_notes = $4,
         closed_by = $5,
         status = 'closed',
         updated_at = NOW()
       WHERE id = $6::uuid
       RETURNING *`,
      [closingAmount, expectedAmount, difference, closingNotes || null, user.id, params.id]
    )

    const closedSession = {
      id: result.rows[0].id,
      openingDate: result.rows[0].opening_date,
      openingTime: result.rows[0].opening_time,
      openingAmount: parseFloat(result.rows[0].opening_amount),
      closingTime: result.rows[0].closing_time,
      closingAmount: parseFloat(result.rows[0].closing_amount),
      expectedAmount: parseFloat(result.rows[0].expected_amount),
      difference: parseFloat(result.rows[0].difference),
      status: result.rows[0].status,
      closingNotes: result.rows[0].closing_notes,
    }

    return NextResponse.json({ session: closedSession })
  } catch (error) {
    console.error('Erro ao fechar caixa:', error)
    return NextResponse.json({ error: "Erro ao fechar caixa" }, { status: 500 })
  }
}
