import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

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

    const { paidAmount, paidDate, paymentMethod, notes } = await request.json()
    const { id } = params

    if (!paymentMethod) {
      return NextResponse.json({ error: "Forma de pagamento é obrigatória" }, { status: 400 })
    }

    let checkQuery = `
      SELECT id, amount, status, company_id, created_by, notes
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

    // Combinar observações existentes com observações do pagamento
    let updatedNotes = account.notes || ''
    if (notes) {
      updatedNotes = updatedNotes 
        ? `${updatedNotes}\n\n--- Pagamento ---\n${notes}`
        : `--- Pagamento ---\n${notes}`
    }

    const result = await query(
      `UPDATE accounts_payable
       SET status = $1,
           payment_date = $2,
           payment_amount = $3,
           payment_method = $4,
           notes = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [newStatus, paidDate, paidAmount, paymentMethod, updatedNotes, id]
    )

    const row = result.rows[0]
    let vendorData = null;
    
    if (row.vendor_id) {
      const vendorResult = await query(
        `SELECT name, cnpj, email, phone FROM vendors WHERE id = $1`,
        [row.vendor_id]
      );
      if (vendorResult.rows.length > 0) {
        vendorData = vendorResult.rows[0];
      }
    }

    const updatedAccount = {
      id: row.id,
      vendorId: row.vendor_id ?? null,
      vendorName: vendorData?.name ?? null,
      vendorDocument: vendorData?.cnpj ?? null,
      vendorEmail: vendorData?.email ?? null,
      vendorPhone: vendorData?.phone ?? null,
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
      paymentMethod: row.payment_method,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }

    return NextResponse.json({ account: updatedAccount })
  } catch (error) {
    console.error("Error marking account as paid:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}