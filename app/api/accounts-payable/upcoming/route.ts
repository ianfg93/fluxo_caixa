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

    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "7")
    const companyFilter = searchParams.get("company")

    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + days)

    // Aplicar filtro de empresa - SEMPRE aplicar, mesmo para master
    const targetCompanyId = companyFilter || user.companyId

    let sql = `
      SELECT ap.*
      FROM accounts_payable ap
      WHERE ap.status = 'pending' 
      AND ap.due_date >= $1 
      AND ap.due_date <= $2
    `
    let params = [today.toISOString(), futureDate.toISOString()]

    // Adicionar filtro de empresa
    if (targetCompanyId) {
      sql += ` AND ap.company_id = $${params.length + 1}::uuid`
      params.push(targetCompanyId)
    }

    sql += ` ORDER BY ap.due_date ASC, ap.created_at DESC`

    const result = await query(sql, params)

    const accounts = result.rows.map((row) => ({
      id: row.id,
      supplierName: row.supplier_name || "Fornecedor",
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
      createdBy: row.created_by,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error("Get upcoming payments API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}