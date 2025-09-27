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
    const companyFilter = searchParams.get("company")

    const baseQuery = `
      SELECT 
        ap.id,
        ap.supplier_name,
        ap.supplier_document,
        ap.supplier_email,
        ap.supplier_phone,
        ap.description,
        ap.amount,
        ap.due_date,
        ap.issue_date,
        ap.status,
        ap.priority,
        ap.category,
        ap.invoice_number,
        ap.notes,
        ap.payment_date,
        ap.payment_amount,
        ap.created_by,
        ap.created_at,
        u.name as created_by_name
      FROM accounts_payable ap
      LEFT JOIN users u ON ap.created_by = u.id
    `

    let queryParams: any[] = []
    let whereConditions: string[] = []

    // Aplicar filtro de empresa - SEMPRE aplicar, mesmo para master
    const targetCompanyId = companyFilter || user.companyId
    if (targetCompanyId) {
      whereConditions.push(`ap.company_id = $${queryParams.length + 1}::uuid`)
      queryParams.push(targetCompanyId)
    }

    // Aplicar filtro de status se especificado
    if (status) {
      whereConditions.push(`ap.status = $${queryParams.length + 1}`)
      queryParams.push(status)
    }

    // Montar query final
    let finalQuery = baseQuery
    if (whereConditions.length > 0) {
      finalQuery += ` WHERE ${whereConditions.join(' AND ')}`
    }
    finalQuery += ` ORDER BY ap.due_date ASC, ap.created_at DESC`

    console.log("Query final (accounts-payable):", finalQuery)
    console.log("Parâmetros:", queryParams)

    const result = await query(finalQuery, queryParams)

    const accounts = result.rows.map((row) => ({
      id: row.id,
      supplierId: row.supplier_id || row.id,
      supplierName: row.supplier_name,
      supplierDocument: row.supplier_document,
      supplierEmail: row.supplier_email,
      supplierPhone: row.supplier_phone,
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
        user.companyId,
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
        user.id,
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