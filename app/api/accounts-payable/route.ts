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
    const status = searchParams.get("status")
    const companyFilter = searchParams.get("company") // Para master filtrar por empresa

    let baseQuery = `
      SELECT 
        ap.*,
        u.name as created_by_name
      FROM accounts_payable ap
      LEFT JOIN users u ON ap.created_by = u.id
    `

    // Aplicar filtro de empresa
    const { query: filteredQuery, params: companyParams } = ApiAuthService.addCompanyFilter(
      baseQuery, 
      user, 
      companyFilter ?? undefined
    )

    let finalQuery = filteredQuery
    let queryParams = [...companyParams]

    // Aplicar filtro de status se especificado
    if (status) {
      const whereClause = finalQuery.includes('WHERE') ? 'AND' : 'WHERE'
      finalQuery += ` ${whereClause} ap.status = $${queryParams.length + 1}`
      queryParams.push(status)
    }

    finalQuery += ` ORDER BY ap.due_date ASC, ap.created_at DESC`

    // Substituir placeholder corretamente
    if (companyParams.length > 0) {
      finalQuery = finalQuery.replace('$COMPANY_FILTER$', `$1`)
    }

    const result = await query(finalQuery, queryParams)

    const accounts = result.rows.map((row) => ({
      id: row.id,
      supplierId: row.supplier_id || row.id, // Fallback para compatibilidade
      supplierName: row.supplier_name,
      description: row.description,
      amount: Number.parseFloat(row.amount),
      dueDate: row.due_date,
      issueDate: row.issue_date,
      status: row.status,
      priority: row.priority,
      category: row.category,
      invoiceNumber: row.invoice_number,
      notes: row.notes,
      paidDate: row.payment_date,
      paidAmount: row.payment_amount ? Number.parseFloat(row.payment_amount) : undefined,
      createdBy: row.created_by_name || 'Usuário não encontrado',
      createdAt: row.created_at,
    }))

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error("Get accounts payable API error:", error)
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
      return NextResponse.json({ error: "Sem permissão para criar contas a pagar" }, { status: 403 })
    }

    const account = await request.json()

    const result = await query(
      `INSERT INTO accounts_payable
       (company_id, supplier_name, supplier_document, supplier_email, supplier_phone, 
        description, amount, issue_date, due_date, status, priority, category, 
        invoice_number, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        user.companyId, // Usar company_id do usuário autenticado
        account.supplierName,
        account.supplierDocument,
        account.supplierEmail,
        account.supplierPhone,
        account.description,
        account.amount,
        account.issueDate,
        account.dueDate,
        account.status || 'pending',
        account.priority || 'medium',
        account.category,
        account.invoiceNumber,
        account.notes,
        user.id, // Usar ID do usuário autenticado
      ],
    )

    const row = result.rows[0]
    const newAccount = {
      id: row.id,
      supplierId: row.supplier_id || row.id,
      supplierName: row.supplier_name,
      description: row.description,
      amount: Number.parseFloat(row.amount),
      dueDate: row.due_date,
      issueDate: row.issue_date,
      status: row.status,
      priority: row.priority,
      category: row.category,
      invoiceNumber: row.invoice_number,
      notes: row.notes,
      paidDate: row.payment_date,
      paidAmount: row.payment_amount ? Number.parseFloat(row.payment_amount) : undefined,
      createdBy: user.name,
      createdAt: row.created_at,
    }

    return NextResponse.json({ account: newAccount })
  } catch (error) {
    console.error("Add account payable API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}