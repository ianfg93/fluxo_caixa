import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

// GET - Buscar sessões de caixa
export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status") // 'open' ou 'closed'
    const date = searchParams.get("date") // Buscar por data específica

    let baseQuery = `
      SELECT
        crs.id,
        crs.opening_date,
        crs.opening_time,
        crs.opening_amount,
        crs.closing_time,
        crs.closing_amount,
        crs.expected_amount,
        crs.difference,
        crs.status,
        crs.opening_notes,
        crs.closing_notes,
        crs.created_at,
        u1.name as opened_by_name,
        u2.name as closed_by_name
      FROM cash_register_sessions crs
      LEFT JOIN users u1 ON crs.opened_by = u1.id
      LEFT JOIN users u2 ON crs.closed_by = u2.id
      WHERE crs.company_id = $1::uuid
    `

    const queryParams: any[] = [user.companyId]

    if (status) {
      queryParams.push(status)
      baseQuery += ` AND crs.status = $${queryParams.length}::varchar`
    }

    if (date) {
      queryParams.push(date)
      baseQuery += ` AND crs.opening_date = $${queryParams.length}::date`
    }

    baseQuery += ` ORDER BY crs.opening_date DESC, crs.opening_time DESC`

    const result = await query(baseQuery, queryParams)

    const sessions = result.rows.map((row) => ({
      id: row.id,
      openingDate: row.opening_date,
      openingTime: row.opening_time,
      openingAmount: parseFloat(row.opening_amount),
      closingTime: row.closing_time,
      closingAmount: row.closing_amount ? parseFloat(row.closing_amount) : null,
      expectedAmount: row.expected_amount ? parseFloat(row.expected_amount) : null,
      difference: row.difference ? parseFloat(row.difference) : null,
      status: row.status,
      openingNotes: row.opening_notes,
      closingNotes: row.closing_notes,
      openedBy: row.opened_by_name,
      closedBy: row.closed_by_name,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Erro ao buscar sessões de caixa:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// POST - Abrir novo caixa
export async function POST(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { openingAmount, openingNotes, openingDate } = body

    if (openingAmount === undefined || openingAmount < 0) {
      return NextResponse.json({ error: "Valor de abertura inválido" }, { status: 400 })
    }

    const date = openingDate || new Date().toISOString().split('T')[0]

    // Verificar se já existe caixa aberto para esta empresa hoje
    const existingOpen = await query(
      `SELECT id FROM cash_register_sessions
       WHERE company_id = $1::uuid
       AND opening_date = $2::date
       AND status = 'open'`,
      [user.companyId, date]
    )

    if (existingOpen.rows.length > 0) {
      return NextResponse.json(
        { error: "Já existe um caixa aberto para esta data" },
        { status: 400 }
      )
    }

    // Criar nova sessão de caixa
    const result = await query(
      `INSERT INTO cash_register_sessions (
        company_id,
        opening_date,
        opening_amount,
        opening_notes,
        opened_by,
        status
      )
      VALUES ($1, $2, $3, $4, $5, 'open')
      RETURNING *`,
      [user.companyId, date, openingAmount, openingNotes || null, user.id]
    )

    const session = {
      id: result.rows[0].id,
      openingDate: result.rows[0].opening_date,
      openingTime: result.rows[0].opening_time,
      openingAmount: parseFloat(result.rows[0].opening_amount),
      status: result.rows[0].status,
      openingNotes: result.rows[0].opening_notes,
      createdAt: result.rows[0].created_at,
    }

    return NextResponse.json({ session }, { status: 201 })
  } catch (error) {
    console.error('Erro ao abrir caixa:', error)
    return NextResponse.json({ error: "Erro ao abrir caixa" }, { status: 500 })
  }
}
