import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

// PUT - Atualizar comanda (valor extra e observações)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { extraAmount, notes } = body

    let updateFields: string[] = ["updated_at = NOW()"]
    let queryParams: any[] = []
    let paramIndex = 1

    if (extraAmount !== undefined) {
      // Buscar subtotal dos itens
      const itemsResult = await query(
        "SELECT COALESCE(SUM(subtotal), 0) as subtotal FROM open_order_items WHERE order_id = $1::uuid",
        [params.id]
      )

      const subtotal = Number.parseFloat(itemsResult.rows[0].subtotal)
      const totalAmount = subtotal + Number(extraAmount)

      updateFields.push(`extra_amount = $${paramIndex}`)
      queryParams.push(extraAmount)
      paramIndex++

      updateFields.push(`total_amount = $${paramIndex}`)
      queryParams.push(totalAmount)
      paramIndex++
    }

    if (notes !== undefined) {
      updateFields.push(`notes = $${paramIndex}`)
      queryParams.push(notes || null)
      paramIndex++
    }

    queryParams.push(params.id)

    const result = await query(
      `UPDATE open_orders 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}::uuid
       RETURNING *`,
      queryParams
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Comanda não encontrada" }, { status: 404 })
    }

    const order = result.rows[0]

    return NextResponse.json({
      order: {
        id: order.id,
        companyId: order.company_id,
        orderNumber: order.order_number,
        status: order.status,
        subtotal: Number.parseFloat(order.subtotal),
        extraAmount: Number.parseFloat(order.extra_amount),
        totalAmount: Number.parseFloat(order.total_amount),
        notes: order.notes,
        createdBy: order.created_by,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        closedAt: order.closed_at,
        closedBy: order.closed_by,
      },
    })
  } catch (error) {
    console.error("Erro ao atualizar comanda:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// DELETE - Excluir comanda
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!user.companyId) {
      return NextResponse.json({ error: "Usuário sem empresa associada" }, { status: 400 })
    }

    const result = await query(
      "DELETE FROM open_orders WHERE id = $1::uuid AND company_id = $2::uuid",
      [params.id, user.companyId]
    )

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Comanda não encontrada" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao excluir comanda:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}