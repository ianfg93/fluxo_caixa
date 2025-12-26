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

    let baseQuery = `
      SELECT
        id, company_id as "companyId", name, is_default as "isDefault",
        logo_url as "logoUrl", logo_position as "logoPosition",
        header_text as "headerText", footer_text as "footerText",
        styles, active,
        created_by as "createdBy",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM budget_templates
    `

    let queryParams: any[] = []
    let whereConditions: string[] = []

    const targetCompanyId = companyFilter || user.companyId
    if (targetCompanyId) {
      whereConditions.push(`company_id = $1::uuid`)
      queryParams.push(targetCompanyId)
    }

    // Filtrar apenas templates ativos por padrão
    whereConditions.push(`active = true`)

    let finalQuery = baseQuery
    if (whereConditions.length > 0) {
      finalQuery += ` WHERE ${whereConditions.join(' AND ')}`
    }
    finalQuery += ` ORDER BY is_default DESC, name ASC`

    const result = await query(finalQuery, queryParams)

    return NextResponse.json({ templates: result.rows })
  } catch (error) {
    console.error('Error fetching budget templates:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Apenas master e administrator podem criar templates
    if (user.role !== 'master' && user.role !== 'administrator') {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const template = await request.json()

    // Validações
    if (!template.name || template.name.trim() === '') {
      return NextResponse.json({ error: "Nome do template é obrigatório" }, { status: 400 })
    }

    // Se está marcando como padrão, desmarcar os outros
    if (template.isDefault) {
      await query(
        `UPDATE budget_templates
         SET is_default = false
         WHERE company_id = $1::uuid AND is_default = true`,
        [user.companyId]
      )
    }

    const styles = template.styles || {
      primaryColor: '#000000',
      fontSize: '12px',
      fontFamily: 'Arial'
    }

    const result = await query(
      `INSERT INTO budget_templates
       (company_id, name, is_default, logo_url, logo_position, header_text, footer_text, styles, active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, company_id as "companyId", name, is_default as "isDefault",
                 logo_url as "logoUrl", logo_position as "logoPosition",
                 header_text as "headerText", footer_text as "footerText",
                 styles, active, created_by as "createdBy",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [
        user.companyId,
        template.name.trim(),
        template.isDefault || false,
        template.logoUrl || null,
        template.logoPosition || 'top-left',
        template.headerText || null,
        template.footerText || null,
        JSON.stringify(styles),
        template.active !== undefined ? template.active : true,
        user.id,
      ]
    )

    return NextResponse.json({ template: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Error creating budget template:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
