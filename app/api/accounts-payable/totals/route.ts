import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyFilter = searchParams.get("company")

    let params: any[] = []
    let whereClause = ""

    const targetCompanyId = companyFilter || user.companyId
    if (targetCompanyId) {
      whereClause = "WHERE company_id = $1::uuid"
      params.push(targetCompanyId)
    }

    let sql = `
      SELECT 
        status_type,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM (
        SELECT 
          amount,
          CASE 
            WHEN status = 'paid' THEN 'paid'
            WHEN status = 'cancelled' THEN 'cancelled'
            WHEN status = 'partially_paid' THEN 'partially_paid'
            WHEN status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE) THEN 'overdue'
            WHEN status = 'pending' THEN 'pending'
            ELSE status 
          END as status_type
        FROM accounts_payable
        ${whereClause}
        
        UNION ALL
        
        SELECT 
          amount,
          'pending' as status_type
        FROM accounts_payable
        WHERE (status = 'overdue' OR (status = 'pending' AND due_date < CURRENT_DATE))
        ${whereClause ? `AND company_id = $${params.length}` : ''}
      ) combined_data
      GROUP BY status_type
    `

    const result = await query(sql, params)

    const totals = {
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
      partially_paid: { count: 0, amount: 0 },
    }

    result.rows.forEach((row) => {
      const status = row.status_type
      if (totals[status as keyof typeof totals]) {
        totals[status as keyof typeof totals] = {
          count: Number.parseInt(row.count),
          amount: Number.parseFloat(row.amount || 0),
        }
      }
    })

    return NextResponse.json({ totals })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}