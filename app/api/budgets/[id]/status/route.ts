import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { status } = await request.json()

    // Validar status
    const validStatuses = ['draft', 'sent', 'approved', 'rejected', 'expired']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 })
    }

    // Verificar se orçamento existe
    const existingBudget = await query(
      `SELECT id FROM budgets WHERE id = $1::uuid AND company_id = $2::uuid`,
      [params.id, user.companyId]
    )

    if (existingBudget.rows.length === 0) {
      return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 })
    }

    // Atualizar status
    const result = await query(
      `UPDATE budgets
       SET status = $1, updated_at = NOW()
       WHERE id = $2::uuid AND company_id = $3::uuid
       RETURNING id, company_id as "companyId", template_id as "templateId",
                 budget_number as "budgetNumber",
                 customer_name as "customerName", customer_email as "customerEmail",
                 customer_phone as "customerPhone", customer_address as "customerAddress",
                 issue_date as "issueDate", validity_date as "validityDate",
                 subtotal, discount, total, notes, status,
                 created_by as "createdBy",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [status, params.id, user.companyId]
    )

    return NextResponse.json({ budget: result.rows[0] })
  } catch (error) {
    console.error('Error updating budget status:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
