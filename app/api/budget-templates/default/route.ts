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

    const { searchParams } = new URL(request.url)
    const companyFilter = searchParams.get("company")
    const targetCompanyId = companyFilter || user.companyId

    const result = await query(
      `SELECT
        id, company_id as "companyId", name, is_default as "isDefault",
        logo_url as "logoUrl", logo_position as "logoPosition",
        header_text as "headerText", footer_text as "footerText",
        styles, active,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM budget_templates
      WHERE company_id = $1::uuid AND is_default = true AND active = true
      LIMIT 1`,
      [targetCompanyId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Template padrão não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ template: result.rows[0] })
  } catch (error) {
    console.error('Error fetching default budget template:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
