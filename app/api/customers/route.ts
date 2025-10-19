import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get("active") === "true"

    let sqlQuery = `
      SELECT 
        c.*,
        COALESCE(SUM(CASE 
          WHEN t.type = 'entry' 
            AND t.customer_id = c.id 
            AND COALESCE(t.amount_received, 0) = 0 
          THEN t.amount 
          ELSE 0 
        END), 0) as total_debt,
        COALESCE(SUM(CASE 
          WHEN t.type = 'entry' 
            AND t.customer_id = c.id 
            AND COALESCE(t.amount_received, 0) > 0 
          THEN t.amount_received 
          ELSE 0 
        END), 0) as total_paid,
        COALESCE(SUM(CASE 
          WHEN t.type = 'entry' 
            AND t.customer_id = c.id 
            AND COALESCE(t.amount_received, 0) = 0 
          THEN t.amount 
          ELSE 0 
        END), 0) - COALESCE(SUM(CASE 
          WHEN t.type = 'entry' 
            AND t.customer_id = c.id 
            AND COALESCE(t.amount_received, 0) > 0 
          THEN t.amount_received 
          ELSE 0 
        END), 0) as balance
      FROM customers c
      LEFT JOIN cash_flow_transactions t ON t.customer_id = c.id
      WHERE c.company_id = $1
    `

    const params: any[] = [user.companyId]

    if (activeOnly) {
      sqlQuery += ` AND c.active = true`
    }

    sqlQuery += `
      GROUP BY c.id
      ORDER BY c.name ASC
    `

    const result = await query(sqlQuery, params)

    const customers = result.rows.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      cpfCnpj: row.cpf_cnpj,
      phone: row.phone,
      email: row.email,
      address: row.address,
      active: row.active,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalDebt: parseFloat(row.total_debt || 0),
      totalPaid: parseFloat(row.total_paid || 0),
      balance: parseFloat(row.balance || 0),
    }))

    return NextResponse.json({ customers })
  } catch (error) {
    console.error("Erro ao buscar clientes:", error)
    return NextResponse.json({ error: "Erro ao buscar clientes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, cpfCnpj, phone, email, address } = body

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Nome do cliente é obrigatório" }, { status: 400 })
    }

    const result = await query(
      `
      INSERT INTO customers (
        company_id, 
        name, 
        cpf_cnpj, 
        phone, 
        email, 
        address,
        active,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, $7)
      RETURNING *
      `,
      [user.companyId, name.trim(), cpfCnpj || null, phone || null, email || null, address || null, user.id]
    )

    const customer = {
      id: result.rows[0].id,
      companyId: result.rows[0].company_id,
      name: result.rows[0].name,
      cpfCnpj: result.rows[0].cpf_cnpj,
      phone: result.rows[0].phone,
      email: result.rows[0].email,
      address: result.rows[0].address,
      active: result.rows[0].active,
      createdBy: result.rows[0].created_by,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    }

    return NextResponse.json({ customer }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar cliente:", error)
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 })
  }
}