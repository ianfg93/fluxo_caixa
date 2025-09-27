import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const canEditAll = ApiAuthService.hasPermission(user, 'edit_all')
    const canEditOwn = ApiAuthService.hasPermission(user, 'edit_own')
    
    if (!canEditAll && !canEditOwn) {
      return NextResponse.json({ error: "Sem permissão para editar contas" }, { status: 403 })
    }

    const updates = await request.json()
    const { id } = params

    let checkQuery = `
      SELECT id, created_by, company_id 
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
      return NextResponse.json({ error: "Sem permissão para editar esta conta" }, { status: 403 })
    }

    const result = await query(
      `UPDATE accounts_payable 
       SET supplier_name = $1, supplier_document = $2, supplier_email = $3, 
           supplier_phone = $4, description = $5, amount = $6, issue_date = $7,
           due_date = $8, status = $9, priority = $10, category = $11, 
           invoice_number = $12, notes = $13, updated_at = NOW()
       WHERE id = $14 
       RETURNING *`,
      [
        updates.supplierName,
        updates.supplierDocument,
        updates.supplierEmail,
        updates.supplierPhone,
        updates.description,
        updates.amount,
        updates.issueDate,
        updates.dueDate,
        updates.status,
        updates.priority,
        updates.category,
        updates.invoiceNumber,
        updates.notes,
        id,
      ],
    )

    const row = result.rows[0]
    const updatedAccount = {
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
      createdBy: row.created_by,
      createdAt: row.created_at,
    }

    return NextResponse.json({ account: updatedAccount })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const canDelete = ApiAuthService.hasPermission(user, 'delete_records') || ApiAuthService.hasPermission(user, 'delete_all')
    
    if (!canDelete) {
      return NextResponse.json({ error: "Sem permissão para deletar contas" }, { status: 403 })
    }

    const { id } = params

    let checkQuery = `
      SELECT id, company_id 
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

    const result = await query(
      "DELETE FROM accounts_payable WHERE id = $1 RETURNING id",
      [id]
    )

    return NextResponse.json({ success: true, deletedId: result.rows[0].id })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}