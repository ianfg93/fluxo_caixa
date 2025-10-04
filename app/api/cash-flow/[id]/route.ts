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
      return NextResponse.json({ error: "Sem permissão para editar transações" }, { status: 403 })
    }

    const updates = await request.json()
    const { id } = params

    // Validar payment_method se fornecido
    if (updates.paymentMethod && !['credito', 'debito', 'pix', 'dinheiro'].includes(updates.paymentMethod)) {
      return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 })
    }

    let checkQuery = `
      SELECT id, created_by, company_id 
      FROM cash_flow_transactions 
      WHERE id = $1
    `
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    const transaction = checkResult.rows[0]

    if (!canEditAll && canEditOwn && transaction.created_by !== user.id) {
      return NextResponse.json({ error: "Sem permissão para editar esta transação" }, { status: 403 })
    }

    const result = await query(
      `UPDATE cash_flow_transactions 
       SET description = $1, amount = $2, category = $3, transaction_date = $4, notes = $5, payment_method = $6, updated_at = NOW()
       WHERE id = $7 
       RETURNING *`,
      [
        updates.description,
        updates.amount,
        updates.category,
        updates.date,
        updates.notes,
        updates.paymentMethod || null,
        id,
      ],
    )

    const row = result.rows[0]
    const updatedTransaction = {
      id: row.id,
      type: row.type,
      description: row.description,
      amount: Number.parseFloat(row.amount),
      category: row.category,
      date: row.transaction_date,
      createdBy: row.created_by,
      createdAt: row.created_at,
      notes: row.notes,
      paymentMethod: row.payment_method,
    }

    return NextResponse.json({ transaction: updatedTransaction })
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
      return NextResponse.json({ error: "Sem permissão para deletar transações" }, { status: 403 })
    }

    const { id } = params

    let checkQuery = `
      SELECT id, company_id 
      FROM cash_flow_transactions 
      WHERE id = $1
    `
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    const result = await query(
      "DELETE FROM cash_flow_transactions WHERE id = $1 RETURNING id",
      [id]
    )

    return NextResponse.json({ success: true, deletedId: result.rows[0].id })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}