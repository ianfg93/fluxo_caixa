import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    // Autenticar usuário
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar permissão
    if (!ApiAuthService.hasPermission(user, 'view_company') && !ApiAuthService.hasPermission(user, 'view_all_companies')) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const companyFilter = searchParams.get("company") // Para master filtrar por empresa

    let baseQuery = `
      SELECT 
        cft.*,
        u.name as created_by_name
      FROM cash_flow_transactions cft
      LEFT JOIN users u ON cft.created_by = u.id
    `

    // Aplicar filtro de empresa
    const { query: filteredQuery, params: companyParams } = ApiAuthService.addCompanyFilter(
      baseQuery, 
      user, 
      companyFilter ?? undefined
    )

    let finalQuery = filteredQuery
    let queryParams = [...companyParams]

    // Aplicar filtro de tipo se especificado
    if (type) {
      const whereClause = finalQuery.includes('WHERE') ? 'AND' : 'WHERE'
      finalQuery += ` ${whereClause} cft.type = $${queryParams.length + 1}`
      queryParams.push(type)
    }

    finalQuery += ` ORDER BY cft.transaction_date DESC, cft.created_at DESC`

    // Substituir placeholder do company_id pelo índice correto do parâmetro
    finalQuery = finalQuery.replace('$COMPANY_FILTER$', `$${companyParams.length > 0 ? '1' : ''}`)

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
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      notes: row.notes,
    }))

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error("Get transactions API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Autenticar usuário
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar permissão
    if (!ApiAuthService.hasPermission(user, 'create_entries')) {
      return NextResponse.json({ error: "Sem permissão para criar transações" }, { status: 403 })
    }

    const transaction = await request.json()

    const result = await query(
      `INSERT INTO cash_flow_transactions 
       (company_id, type, description, amount, category, transaction_date, created_by, attachments, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [
        user.companyId, // Usar company_id do usuário autenticado
        transaction.type,
        transaction.description,
        transaction.amount,
        transaction.category,
        transaction.date,
        user.id, // Usar ID do usuário autenticado
        transaction.attachments ? JSON.stringify(transaction.attachments) : null,
        transaction.notes,
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
      createdBy: user.name, // Nome do usuário autenticado
      createdAt: row.created_at,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      notes: row.notes,
    }

    return NextResponse.json({ transaction: newTransaction })
  } catch (error) {
    console.error("Add transaction API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}