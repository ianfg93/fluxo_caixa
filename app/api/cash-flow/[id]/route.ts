import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Autenticar usuário
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar permissão para editar
    const canEditAll = ApiAuthService.hasPermission(user, 'edit_all')
    const canEditOwn = ApiAuthService.hasPermission(user, 'edit_own')
    
    if (!canEditAll && !canEditOwn) {
      return NextResponse.json({ error: "Sem permissão para editar transações" }, { status: 403 })
    }

    const updates = await request.json()
    const { id } = params

    // Verificar se a transação existe e pertence à empresa do usuário
    let checkQuery = `
      SELECT id, created_by, company_id 
      FROM cash_flow_transactions 
      WHERE id = $1
    `
    let checkParams = [id]

    // Se não for master, filtrar por empresa
    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    const transaction = checkResult.rows[0]

    // Se só pode editar próprios registros, verificar se é o criador
    if (!canEditAll && canEditOwn && transaction.created_by !== user.id) {
      return NextResponse.json({ error: "Sem permissão para editar esta transação" }, { status: 403 })
    }

    // Atualizar a transação
    const result = await query(
      `UPDATE cash_flow_transactions 
       SET description = $1, amount = $2, category = $3, transaction_date = $4, notes = $5, updated_at = NOW()
       WHERE id = $6 
       RETURNING *`,
      [
        updates.description,
        updates.amount,
        updates.category,
        updates.date,
        updates.notes,
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
    }

    return NextResponse.json({ transaction: updatedTransaction })
  } catch (error) {
    console.error("Update transaction API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Autenticar usuário
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar permissão para deletar (apenas master e administrator)
    const canDelete = ApiAuthService.hasPermission(user, 'delete_records') || ApiAuthService.hasPermission(user, 'delete_all')
    
    if (!canDelete) {
      return NextResponse.json({ error: "Sem permissão para deletar transações" }, { status: 403 })
    }

    const { id } = params

    // Verificar se a transação existe e pertence à empresa do usuário
    let checkQuery = `
      SELECT id, company_id 
      FROM cash_flow_transactions 
      WHERE id = $1
    `
    let checkParams = [id]

    // Se não for master, filtrar por empresa
    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    // Deletar a transação
    const result = await query(
      "DELETE FROM cash_flow_transactions WHERE id = $1 RETURNING id",
      [id]
    )

    return NextResponse.json({ success: true, deletedId: result.rows[0].id })
  } catch (error) {
    console.error("Delete transaction API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}