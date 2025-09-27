import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const canEditAll = ApiAuthService.hasPermission(user, 'edit_all')
    const canEditOwn = ApiAuthService.hasPermission(user, 'edit_own')
    
    if (!canEditAll && !canEditOwn) {
      return NextResponse.json({ error: "Sem permissão para marcar contas como pagas" }, { status: 403 })
    }

    const { paidAmount, paidDate } = await request.json()
    const { id } = params

    let checkQuery = `
      SELECT id, amount, status, company_id, created_by
      FROM accounts_payable 
      WHERE id = $1
    `
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Conta não encontrada" }, { status: 404 })
    }

    const account = checkResult.rows[0]

    if (!canEditAll && canEditOwn && account.created_by !== user.id) {
      return NextResponse.json({ error: "Sem permissão para marcar esta conta como paga" }, { status: 403 })
    }

    if (account.status === 'paid') {
      return NextResponse.json({ error: "Esta conta já está marcada como paga" }, { status: 400 })
    }

    const originalAmount = Number.parseFloat(account.amount)
    const paidAmountNum = Number.parseFloat(paidAmount)
    
    let newStatus = 'paid'
    if (paidAmountNum < originalAmount) {
      newStatus = 'partially_paid'
    }

    const result = await query(
      `UPDATE accounts_payable 
       SET status = $1, 
           payment_date = $2, 
           payment_amount = $3,
           updated_at = NOW()
       WHERE id = $4 
       RETURNING *`,
      [newStatus, paidDate, paidAmount, id]
    )

    const row = result.rows[0]
    const updatedAccount = {
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
      createdBy: row.created_by,
      createdAt: row.created_at,
    }

    return NextResponse.json({ account: updatedAccount })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}