import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

// GET - Buscar sangrias
export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    let baseQuery = `
      SELECT
        cw.id,
        cw.amount,
        cw.withdrawal_date,
        cw.withdrawal_time,
        cw.reason,
        cw.notes,
        cw.created_at,
        u.name as withdrawn_by_name
      FROM cash_withdrawals cw
      LEFT JOIN users u ON cw.withdrawn_by = u.id
      WHERE cw.company_id = $1::uuid
    `

    const queryParams: any[] = [user.companyId]

    if (date) {
      queryParams.push(date)
      baseQuery += ` AND cw.withdrawal_date = $${queryParams.length}::date`
    }

    baseQuery += ` ORDER BY cw.withdrawal_time DESC`

    const result = await query(baseQuery, queryParams)

    const withdrawals = result.rows.map((row) => ({
      id: row.id,
      amount: parseFloat(row.amount),
      withdrawalDate: row.withdrawal_date,
      withdrawalTime: row.withdrawal_time,
      reason: row.reason,
      notes: row.notes,
      withdrawnBy: row.withdrawn_by_name,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ withdrawals })
  } catch (error) {
    console.error('Erro ao buscar sangrias:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// POST - Registrar nova sangria
export async function POST(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { amount, reason, notes } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Valor inválido" }, { status: 400 })
    }

    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: "Motivo é obrigatório" }, { status: 400 })
    }

    // Converte para o timezone de Brasília
    const now = new Date()
    const brazilDate = new Date(now.toLocaleString('en-US', {
      timeZone: 'America/Sao_Paulo'
    }))

    const year = brazilDate.getFullYear()
    const month = String(brazilDate.getMonth() + 1).padStart(2, '0')
    const day = String(brazilDate.getDate()).padStart(2, '0')
    const today = `${year}-${month}-${day}`

    // Buscar sessão de caixa aberta do dia (opcional)
    const sessionResult = await query(
      `SELECT id FROM cash_register_sessions
       WHERE company_id = $1::uuid
       AND opening_date = $2::date
       AND status = 'open'
       LIMIT 1`,
      [user.companyId, today]
    )

    const sessionId = sessionResult.rows.length > 0 ? sessionResult.rows[0].id : null

    // Registrar sangria
    const result = await query(
      `INSERT INTO cash_withdrawals (
        company_id,
        cash_register_session_id,
        amount,
        withdrawal_date,
        reason,
        notes,
        withdrawn_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [user.companyId, sessionId, amount, today, reason, notes || null, user.id]
    )

    const withdrawal = {
      id: result.rows[0].id,
      amount: parseFloat(result.rows[0].amount),
      withdrawalDate: result.rows[0].withdrawal_date,
      withdrawalTime: result.rows[0].withdrawal_time,
      reason: result.rows[0].reason,
      notes: result.rows[0].notes,
      createdAt: result.rows[0].created_at,
    }

    return NextResponse.json({ withdrawal }, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar sangria:', error)
    return NextResponse.json({ error: "Erro ao registrar sangria" }, { status: 500 })
  }
}
