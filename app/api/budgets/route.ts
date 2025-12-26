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

    const { searchParams } = new URL(request.url)
    const companyFilter = searchParams.get("company")
    const statusFilter = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    let baseQuery = `
      SELECT
        b.id, b.company_id as "companyId", b.template_id as "templateId",
        b.customer_id as "customerId", b.budget_number as "budgetNumber",
        b.customer_name as "customerName", b.customer_email as "customerEmail",
        b.customer_phone as "customerPhone", b.customer_address as "customerAddress",
        b.issue_date as "issueDate", b.validity_date as "validityDate",
        b.subtotal, b.discount, b.total,
        b.notes, b.status,
        b.created_by as "createdBy",
        b.created_at as "createdAt",
        b.updated_at as "updatedAt",
        t.name as "templateName"
      FROM budgets b
      LEFT JOIN budget_templates t ON b.template_id = t.id
    `

    let queryParams: any[] = []
    let whereConditions: string[] = []
    let paramCount = 1

    const targetCompanyId = companyFilter || user.companyId
    if (targetCompanyId) {
      whereConditions.push(`b.company_id = $${paramCount}::uuid`)
      queryParams.push(targetCompanyId)
      paramCount++
    }

    if (statusFilter) {
      whereConditions.push(`b.status = $${paramCount}`)
      queryParams.push(statusFilter)
      paramCount++
    }

    if (startDate) {
      whereConditions.push(`b.issue_date >= $${paramCount}::date`)
      queryParams.push(startDate)
      paramCount++
    }

    if (endDate) {
      whereConditions.push(`b.issue_date <= $${paramCount}::date`)
      queryParams.push(endDate)
      paramCount++
    }

    let finalQuery = baseQuery
    if (whereConditions.length > 0) {
      finalQuery += ` WHERE ${whereConditions.join(' AND ')}`
    }
    finalQuery += ` ORDER BY b.created_at DESC`

    const result = await query(finalQuery, queryParams)

    return NextResponse.json({ budgets: result.rows })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const budget = await request.json()

    // Validações
    if (!budget.templateId) {
      return NextResponse.json({ error: "Template é obrigatório" }, { status: 400 })
    }

    if (!budget.items || budget.items.length === 0) {
      return NextResponse.json({ error: "Orçamento deve ter pelo menos um item" }, { status: 400 })
    }

    // Verificar se template existe
    const templateExists = await query(
      `SELECT id FROM budget_templates WHERE id = $1::uuid AND company_id = $2::uuid`,
      [budget.templateId, user.companyId]
    )

    if (templateExists.rows.length === 0) {
      return NextResponse.json({ error: "Template não encontrado" }, { status: 404 })
    }

    // Gerar número do orçamento
    const budgetNumberResult = await query(
      `SELECT generate_budget_number($1::uuid) as number`,
      [user.companyId]
    )
    const budgetNumber = budgetNumberResult.rows[0].number

    // Calcular totais
    let subtotal = 0
    budget.items.forEach((item: any) => {
      subtotal += item.quantity * item.unitPrice
    })

    const discount = budget.discount || 0
    const total = subtotal - discount

    // Inserir orçamento
    const budgetResult = await query(
      `INSERT INTO budgets
       (company_id, template_id, customer_id, budget_number, customer_name, customer_email,
        customer_phone, customer_address, issue_date, validity_date,
        subtotal, discount, total, notes, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id, company_id as "companyId", template_id as "templateId",
                 customer_id as "customerId", budget_number as "budgetNumber",
                 customer_name as "customerName", customer_email as "customerEmail",
                 customer_phone as "customerPhone", customer_address as "customerAddress",
                 issue_date as "issueDate", validity_date as "validityDate",
                 subtotal, discount, total, notes, status,
                 created_by as "createdBy",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [
        user.companyId,
        budget.templateId,
        budget.customerId || null,
        budgetNumber,
        budget.customerName || null,
        budget.customerEmail || null,
        budget.customerPhone || null,
        budget.customerAddress || null,
        budget.issueDate || new Date(),
        budget.validityDate || null,
        subtotal,
        discount,
        total,
        budget.notes || null,
        'draft',
        user.id,
      ]
    )

    const createdBudget = budgetResult.rows[0]

    // Inserir itens
    for (let i = 0; i < budget.items.length; i++) {
      const item = budget.items[i]
      const itemTotal = item.quantity * item.unitPrice

      await query(
        `INSERT INTO budget_items
         (budget_id, product_id, item_type, description, quantity, unit_price, total_price, display_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          createdBudget.id,
          item.productId || null,
          item.itemType || 'custom',
          item.description,
          item.quantity,
          item.unitPrice,
          itemTotal,
          i,
        ]
      )
    }

    return NextResponse.json({ budget: createdBudget }, { status: 201 })
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
