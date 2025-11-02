import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

// DELETE - Remover item da comanda
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    await query("BEGIN")

    try {
      // Remover item
      const deleteResult = await query(
        "DELETE FROM open_order_items WHERE id = $1::uuid AND order_id = $2::uuid",
        [params.itemId, params.id]
      )

      if (deleteResult.rowCount === 0) {
        await query("ROLLBACK")
        return NextResponse.json({ error: "Item não encontrado" }, { status: 404 })
      }

      // Recalcular totais
      const itemsResult = await query(
        "SELECT COALESCE(SUM(subtotal), 0) as subtotal FROM open_order_items WHERE order_id = $1::uuid",
        [params.id]
      )

      const orderResult = await query(
        "SELECT extra_amount FROM open_orders WHERE id = $1::uuid",
        [params.id]
      )

      const newSubtotal = Number.parseFloat(itemsResult.rows[0].subtotal)
      const extraAmount = orderResult.rows[0] ? Number.parseFloat(orderResult.rows[0].extra_amount) : 0
      const totalAmount = newSubtotal + extraAmount

      await query(
        `UPDATE open_orders 
         SET subtotal = $1, total_amount = $2, updated_at = NOW()
         WHERE id = $3::uuid`,
        [newSubtotal, totalAmount, params.id]
      )

      await query("COMMIT")

      return NextResponse.json({ success: true })
    } catch (error) {
      await query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Erro ao remover item:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}