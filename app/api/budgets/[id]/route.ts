import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Buscar orçamento
    const budgetResult = await query(
      `SELECT
        id, company_id as "companyId", template_id as "templateId",
        customer_id as "customerId", budget_number as "budgetNumber",
        customer_name as "customerName", customer_email as "customerEmail",
        customer_phone as "customerPhone", customer_address as "customerAddress",
        issue_date as "issueDate", validity_date as "validityDate",
        subtotal, discount, total,
        notes, status,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM budgets
      WHERE id = $1::uuid AND company_id = $2::uuid`,
      [params.id, user.companyId]
    )

    if (budgetResult.rows.length === 0) {
      return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 })
    }

    const budget = budgetResult.rows[0]

    // Buscar itens
    const itemsResult = await query(
      `SELECT
        id, budget_id as "budgetId", product_id as "productId",
        item_type as "itemType", description, quantity, unit_price as "unitPrice",
        total_price as "totalPrice", display_order as "displayOrder",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM budget_items
      WHERE budget_id = $1::uuid
      ORDER BY display_order ASC`,
      [params.id]
    )

    budget.items = itemsResult.rows

    return NextResponse.json({ budget })
  } catch (error) {
    console.error('Error fetching budget:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const updates = await request.json()

    // Verificar se orçamento existe
    const existingBudget = await query(
      `SELECT id, status FROM budgets WHERE id = $1::uuid AND company_id = $2::uuid`,
      [params.id, user.companyId]
    )

    if (existingBudget.rows.length === 0) {
      return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 })
    }

    // Não permitir edição de orçamentos aprovados ou rejeitados
    const currentStatus = existingBudget.rows[0].status
    if (currentStatus === 'approved' || currentStatus === 'rejected') {
      return NextResponse.json(
        { error: "Não é possível editar orçamentos aprovados ou rejeitados" },
        { status: 400 }
      )
    }

    // Construir query de update
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.customerName !== undefined) {
      fields.push(`customer_name = $${paramCount}`)
      values.push(updates.customerName)
      paramCount++
    }

    if (updates.customerEmail !== undefined) {
      fields.push(`customer_email = $${paramCount}`)
      values.push(updates.customerEmail)
      paramCount++
    }

    if (updates.customerPhone !== undefined) {
      fields.push(`customer_phone = $${paramCount}`)
      values.push(updates.customerPhone)
      paramCount++
    }

    if (updates.customerAddress !== undefined) {
      fields.push(`customer_address = $${paramCount}`)
      values.push(updates.customerAddress)
      paramCount++
    }

    if (updates.validityDate !== undefined) {
      fields.push(`validity_date = $${paramCount}`)
      values.push(updates.validityDate)
      paramCount++
    }

    if (updates.notes !== undefined) {
      fields.push(`notes = $${paramCount}`)
      values.push(updates.notes)
      paramCount++
    }

    // Se os itens foram atualizados, recalcular totais
    if (updates.items) {
      // Deletar itens antigos
      await query(`DELETE FROM budget_items WHERE budget_id = $1::uuid`, [params.id])

      // Inserir novos itens
      let subtotal = 0
      for (let i = 0; i < updates.items.length; i++) {
        const item = updates.items[i]
        const itemTotal = item.quantity * item.unitPrice
        subtotal += itemTotal

        await query(
          `INSERT INTO budget_items
           (budget_id, product_id, item_type, description, quantity, unit_price, total_price, display_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            params.id,
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

      const discount = updates.discount !== undefined ? updates.discount : 0
      const total = subtotal - discount

      fields.push(`subtotal = $${paramCount}`)
      values.push(subtotal)
      paramCount++

      fields.push(`discount = $${paramCount}`)
      values.push(discount)
      paramCount++

      fields.push(`total = $${paramCount}`)
      values.push(total)
      paramCount++
    } else if (updates.discount !== undefined) {
      // Apenas atualizar desconto
      fields.push(`discount = $${paramCount}`)
      values.push(updates.discount)
      paramCount++

      // Recalcular total
      const currentBudget = await query(
        `SELECT subtotal FROM budgets WHERE id = $1::uuid`,
        [params.id]
      )
      const newTotal = currentBudget.rows[0].subtotal - updates.discount

      fields.push(`total = $${paramCount}`)
      values.push(newTotal)
      paramCount++
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

    values.push(params.id)
    values.push(user.companyId)

    const result = await query(
      `UPDATE budgets
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}::uuid AND company_id = $${paramCount + 1}::uuid
       RETURNING id, company_id as "companyId", template_id as "templateId",
                 budget_number as "budgetNumber",
                 customer_name as "customerName", customer_email as "customerEmail",
                 customer_phone as "customerPhone", customer_address as "customerAddress",
                 issue_date as "issueDate", validity_date as "validityDate",
                 subtotal, discount, total, notes, status,
                 created_by as "createdBy",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      values
    )

    return NextResponse.json({ budget: result.rows[0] })
  } catch (error) {
    console.error('Error updating budget:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar se pode deletar (apenas rascunhos)
    const budgetCheck = await query(
      `SELECT status FROM budgets WHERE id = $1::uuid AND company_id = $2::uuid`,
      [params.id, user.companyId]
    )

    if (budgetCheck.rows.length === 0) {
      return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 })
    }

    if (budgetCheck.rows[0].status !== 'draft') {
      return NextResponse.json(
        { error: "Apenas orçamentos em rascunho podem ser deletados" },
        { status: 400 }
      )
    }

    // Deletar orçamento (itens serão deletados automaticamente por CASCADE)
    const result = await query(
      `DELETE FROM budgets
       WHERE id = $1::uuid AND company_id = $2::uuid
       RETURNING id`,
      [params.id, user.companyId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
