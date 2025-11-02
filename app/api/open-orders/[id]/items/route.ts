import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

// POST - Adicionar item à comanda
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!ApiAuthService.hasPermission(user, 'create_entries')) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const body = await request.json()
    const { productId, productName, productPrice, quantity } = body

    if (!productId || !productName || !productPrice || !quantity) {
      return NextResponse.json({ error: "Dados incompletos" }, { status: 400 })
    }

    const subtotal = Number(productPrice) * Number(quantity)

    await query("BEGIN")

    try {
      // Adicionar item
      await query(
        `INSERT INTO open_order_items 
         (order_id, product_id, product_name, product_price, quantity, subtotal) 
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)`,
        [params.id, productId, productName, productPrice, quantity, subtotal]
      )

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
    console.error("Erro ao adicionar item:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}