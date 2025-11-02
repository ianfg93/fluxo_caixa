import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

// GET - Buscar todas as comandas abertas
export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!user.companyId) {
      return NextResponse.json({ error: "Usuário sem empresa associada" }, { status: 400 })
    }

    const result = await query(
      `SELECT 
        o.id,
        o.company_id,
        o.order_number,
        o.status,
        o.subtotal,
        o.extra_amount,
        o.total_amount,
        o.notes,
        o.created_by,
        o.created_at,
        o.updated_at,
        o.closed_at,
        o.closed_by
      FROM open_orders o
      WHERE o.company_id = $1::uuid AND o.status = 'open'
      ORDER BY o.created_at DESC`,
      [user.companyId]
    )

    const orders = await Promise.all(
      result.rows.map(async (order) => {
        const itemsResult = await query(
          `SELECT 
            id,
            order_id,
            product_id,
            product_name,
            product_price,
            quantity,
            subtotal,
            added_at
          FROM open_order_items
          WHERE order_id = $1::uuid
          ORDER BY added_at ASC`,
          [order.id]
        )

        return {
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
          items: itemsResult.rows.map((item) => ({
            id: item.id,
            orderId: item.order_id,
            productId: item.product_id,
            productName: item.product_name,
            productPrice: Number.parseFloat(item.product_price),
            quantity: item.quantity,
            subtotal: Number.parseFloat(item.subtotal),
            addedAt: item.added_at,
          })),
        }
      })
    )

    return NextResponse.json({ orders })
  } catch (error) {
    console.error("Erro ao buscar comandas:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

// POST - Criar nova comanda
export async function POST(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    console.log('DEBUG - User object:', JSON.stringify(user, null, 2))

    if (!user.companyId) {
      return NextResponse.json({ error: "Usuário sem empresa associada" }, { status: 400 })
    }

    if (!user.id) {
      return NextResponse.json({ error: "ID do usuário não encontrado" }, { status: 400 })
    }

    if (!ApiAuthService.hasPermission(user, 'create_entries')) {
      return NextResponse.json({ error: "Sem permissão para criar comandas" }, { status: 403 })
    }

    const body = await request.json()
    const { orderNumber, notes } = body

    if (!orderNumber) {
      return NextResponse.json({ error: "Número da comanda é obrigatório" }, { status: 400 })
    }

    console.log('DEBUG - Inserindo comanda:', {
      companyId: user.companyId,
      orderNumber,
      notes,
      userId: user.id
    })

    const result = await query(
      `INSERT INTO open_orders 
       (company_id, order_number, notes, created_by, subtotal, extra_amount, total_amount) 
       VALUES ($1::uuid, $2, $3, $4::uuid, 0, 0, 0) 
       RETURNING *`,
      [user.companyId, orderNumber, notes || null, user.id]
    )

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
    console.error("Erro ao criar comanda:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}