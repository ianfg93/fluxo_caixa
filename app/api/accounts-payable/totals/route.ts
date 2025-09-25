import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    // Autenticar usuário
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const companyFilter = searchParams.get("company")

    let sql = `
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM accounts_payable
    `
    let params: any[] = []

    // Aplicar filtro de empresa
    if (user.role !== 'master' || companyFilter) {
      const targetCompanyId = companyFilter || user.companyId
      sql += ` WHERE company_id = $1`
      params.push(targetCompanyId)
    }

    sql += ` GROUP BY status`

    const result = await query(sql, params)

    const totals = {
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    }

    result.rows.forEach((row) => {
      if (totals[row.status as keyof typeof totals]) {
        totals[row.status as keyof typeof totals] = {
          count: Number.parseInt(row.count),
          amount: Number.parseFloat(row.amount || 0),
        }
      }
    })

    return NextResponse.json({ totals })
  } catch (error) {
    console.error("Get totals by status API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}