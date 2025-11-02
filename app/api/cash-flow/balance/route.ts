import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!ApiAuthService.hasPermission(user, 'view_company') && !ApiAuthService.hasPermission(user, 'view_all_companies')) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const companyFilter = searchParams.get("company")

    const targetCompanyId = companyFilter || user.companyId

    let baseQuery = `
      SELECT 
        SUM(CASE WHEN type = 'entry' THEN amount ELSE 0 END) as entries,
        SUM(CASE WHEN type = 'exit' THEN amount ELSE 0 END) as exits
      FROM cash_flow_transactions
    `

    let result
    if (targetCompanyId) {
      baseQuery += ` WHERE company_id = $1::uuid`
      result = await query(baseQuery, [targetCompanyId])
    } else {
      result = await query(baseQuery)
    }

    const entries = Number.parseFloat(result.rows[0].entries) || 0
    const exits = Number.parseFloat(result.rows[0].exits) || 0

    return NextResponse.json({
      balance: {
        total: entries - exits,
        entries,
        exits,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}