import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar se o cliente existe e pertence à empresa do usuário
    const customerCheck = await query(
      "SELECT id FROM customers WHERE id = $1 AND company_id = $2",
      [params.id, user.companyId]
    )

    if (customerCheck.rows.length === 0) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    const result = await query(
      `
      SELECT 
        t.id,
        t.transaction_date as date,
        t.description,
        t.amount,
        t.amount_received,
        t.payment_method,
        t.notes,
        CASE 
          WHEN t.amount_received = 0 THEN 'sale'
          ELSE 'payment'
        END as type
      FROM cash_flow_transactions t
      WHERE t.customer_id = $1
        AND t.type = 'entry'
        AND t.company_id = $2
      ORDER BY t.transaction_date DESC, t.created_at DESC
      `,
      [params.id, user.companyId]
    )

    const transactions = result.rows.map((row) => ({
      id: row.id,
      date: row.date,
      type: row.type,
      description: row.description,
      amount: parseFloat(row.amount),
      amountReceived: parseFloat(row.amount_received || 0),
      paymentMethod: row.payment_method,
      notes: row.notes,
    }))

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error("Erro ao buscar transações do cliente:", error)
    return NextResponse.json({ error: "Erro ao buscar transações" }, { status: 500 })
  }
}