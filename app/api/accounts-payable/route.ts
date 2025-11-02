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
    const status = searchParams.get("status")
    const companyFilter = searchParams.get("company")

    let baseQuery = `
      SELECT 
        ap.id,
        ap.vendor_id as "vendorId",
        v.name as "vendorName",
        v.cnpj as "vendorDocument",
        v.email as "vendorEmail",
        v.phone as "vendorPhone",
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
        ap.created_at,
        u.name as created_by_name
      FROM accounts_payable ap
      LEFT JOIN vendors v ON ap.vendor_id = v.id
      LEFT JOIN users u ON ap.created_by = u.id
    `

    let queryParams: any[] = []
    let whereConditions: string[] = []

    const targetCompanyId = companyFilter || user.companyId
    if (targetCompanyId) {
      whereConditions.push(`ap.company_id = $${queryParams.length + 1}::uuid`)
      queryParams.push(targetCompanyId)
    }

    if (status) {
      whereConditions.push(`ap.status = $${queryParams.length + 1}`)
      queryParams.push(status)
    }

    let finalQuery = baseQuery
    if (whereConditions.length > 0) {
      finalQuery += ` WHERE ${whereConditions.join(' AND ')}`
    }
    finalQuery += ` ORDER BY ap.created_at DESC, ap.due_date ASC`

    const result = await query(finalQuery, queryParams)

    const accounts = result.rows.map((row) => ({
      id: row.id,
      vendorId: row.vendorId,
      vendorName: row.vendorName,
      vendorDocument: row.vendorDocument,
      vendorEmail: row.vendorEmail,
      vendorPhone: row.vendorPhone,
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
    console.error("Error in GET /api/accounts-payable:", error)
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
      return NextResponse.json({ error: "Sem permissão para criar contas a pagar" }, { status: 403 })
    }

    const account = await request.json()
    
    // Validar se o fornecedor existe e pertence à empresa do usuário
    const vendorCheck = await query(
      "SELECT id, name, cnpj, email, phone FROM vendors WHERE id = $1 AND company_id = $2",
      [account.vendorId, user.companyId]
    )

    if (vendorCheck.rows.length === 0) {
      return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })
    }

    const vendor = vendorCheck.rows[0]

    const result = await query(
      `INSERT INTO accounts_payable 
      (company_id, vendor_id, description, amount, due_date, issue_date, status, priority, category, invoice_number, notes, created_by) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
      RETURNING *`,
      [
        user.companyId,
        account.vendorId,
        account.description,
        account.amount,
        account.dueDate,
        account.issueDate,
        account.status,
        account.priority,
        account.category,
        account.invoiceNumber || null,
        account.notes || null,
        user.id,
      ]
    )

    const row = result.rows[0]
    const newAccount = {
      id: row.id,
      vendorId: row.vendor_id,
      vendorName: vendor.name,
      vendorDocument: vendor.cnpj,
      vendorEmail: vendor.email,
      vendorPhone: vendor.phone,
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
    console.error("Error in POST /api/accounts-payable:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}