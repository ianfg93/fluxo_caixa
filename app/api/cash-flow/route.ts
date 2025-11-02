import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

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
        cft.payment_method,
        cft.created_by,
        cft.created_at,
        cft.customer_id,
        cft.amount_received,
        u.name as created_by_name,
        c.name as customer_name
      FROM cash_flow_transactions cft
      LEFT JOIN users u ON cft.created_by = u.id
      LEFT JOIN customers c ON cft.customer_id = c.id
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
      paymentMethod: row.payment_method,
      customerId: row.customer_id,
      customerName: row.customer_name,
      amountReceived: row.amount_received ? Number.parseFloat(row.amount_received) : Number.parseFloat(row.amount),
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

    const body = await request.json()
    const { 
      type, 
      description, 
      amount, 
      category, 
      date, 
      paymentMethod, 
      notes, 
      products,
      customerId,
      amountReceived 
    } = body

    if (!type || !description || !amount || !category || !date) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    const transactionDate = new Date(date)

    const result = await query(
      `
      INSERT INTO cash_flow_transactions (
        company_id,
        type,
        description,
        amount,
        category,
        transaction_date,
        payment_method,
        notes,
        created_by,
        customer_id,
        amount_received
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
      `,
      [
        user.companyId,
        type,
        description,
        amount,
        category,
        transactionDate,
        paymentMethod || null,
        notes || null,
        user.id,
        customerId || null,
        amountReceived !== undefined ? amountReceived : amount
      ]
    )

    // Processar produtos se houver
    if (products && Array.isArray(products) && products.length > 0) {
      for (const product of products) {
        await query(
          `
          UPDATE products
          SET quantity = quantity - $1
          WHERE id = $2 AND company_id = $3
          `,
          [product.quantity, product.productId, user.companyId]
        )
      }
    }

    const transaction = {
      id: result.rows[0].id,
      type: result.rows[0].type,
      description: result.rows[0].description,
      amount: parseFloat(result.rows[0].amount),
      category: result.rows[0].category,
      date: result.rows[0].transaction_date,
      paymentMethod: result.rows[0].payment_method,
      notes: result.rows[0].notes,
      createdBy: result.rows[0].created_by,
      createdAt: result.rows[0].created_at,
      customerId: result.rows[0].customer_id,
      amountReceived: result.rows[0].amount_received ? parseFloat(result.rows[0].amount_received) : parseFloat(result.rows[0].amount),
    }

    return NextResponse.json({ transaction }, { status: 201 })
  } catch (error) {
    console.error("Erro ao criar transação:", error)
    return NextResponse.json({ error: "Erro ao criar transação" }, { status: 500 })
  }
}