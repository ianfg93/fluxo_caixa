import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

// POST - Fechar comanda
export async function POST(
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
      `UPDATE open_orders 
       SET status = 'closed', closed_at = NOW(), closed_by = $1::uuid, updated_at = NOW()
       WHERE id = $2::uuid AND company_id = $3::uuid
       RETURNING *`,
      [user.id, params.id, user.companyId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Comanda não encontrada" }, { status: 404 })
    }

    const order = result.rows[0]

    return NextResponse.json({
      success: true,
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
    console.error("Erro ao fechar comanda:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}