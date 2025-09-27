import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!ApiAuthService.hasPermission(user, 'view_company') && !ApiAuthService.hasPermission(user, 'view_all_companies')) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const companyFilter = searchParams.get("company")

    let baseQuery = `
      SELECT 
        cft.id,
        cft.type,
        cft.description,
        cft.amount,
        cft.category,
        cft.transaction_date,
        cft.notes,
        cft.created_by,
        cft.created_at,
        u.name as created_by_name
      FROM cash_flow_transactions cft
      LEFT JOIN users u ON cft.created_by = u.id
    `

    let queryParams: any[] = []
    let whereConditions: string[] = []

    const targetCompanyId = companyFilter || user.companyId
    if (targetCompanyId) {
      whereConditions.push(`cft.company_id = $${queryParams.length + 1}::uuid`)
      queryParams.push(targetCompanyId)
    }

    if (type) {
      whereConditions.push(`cft.type = $${queryParams.length + 1}::varchar`)
      queryParams.push(type)
    }

    let finalQuery = baseQuery
    if (whereConditions.length > 0) {
      finalQuery += ` WHERE ${whereConditions.join(' AND ')}`
    }
    finalQuery += ` ORDER BY cft.transaction_date DESC, cft.created_at DESC`

    const result = await query(finalQuery, queryParams)

    const transactions = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      description: row.description,
      amount: Number.parseFloat(row.amount),
      category: row.category,
      date: row.transaction_date,
      createdBy: row.created_by_name || 'Usuário não encontrado',
      createdAt: row.created_at,
      notes: row.notes,
    }))

    return NextResponse.json({ transactions })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!ApiAuthService.hasPermission(user, 'create_entries')) {
      return NextResponse.json({ error: "Sem permissão para criar transações" }, { status: 403 })
    }

    const transaction = await request.json()

    const result = await query(
      `INSERT INTO cash_flow_transactions 
       (company_id, type, description, amount, category, transaction_date, created_by, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        user.companyId,
        transaction.type,
        transaction.description,
        transaction.amount,
        transaction.category,
        transaction.date,
        user.id,
        transaction.notes || null,
      ],
    )

    const row = result.rows[0]
    const newTransaction = {
      id: row.id,
      type: row.type,
      description: row.description,
      amount: Number.parseFloat(row.amount),
      category: row.category,
      date: row.transaction_date,
      createdBy: user.name,
      createdAt: row.created_at,
      notes: row.notes,
    }

    return NextResponse.json({ transaction: newTransaction })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}