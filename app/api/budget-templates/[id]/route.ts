import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

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
      WHERE id = $1::uuid AND company_id = $2::uuid`,
      [params.id, user.companyId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Template não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ template: result.rows[0] })
  } catch (error) {
    console.error('Error fetching budget template:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Apenas master e administrator podem editar templates
    if (user.role !== 'master' && user.role !== 'administrator') {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const updates = await request.json()

    // Verificar se template existe e pertence à empresa
    const existingTemplate = await query(
      `SELECT id FROM budget_templates WHERE id = $1::uuid AND company_id = $2::uuid`,
      [params.id, user.companyId]
    )

    if (existingTemplate.rows.length === 0) {
      return NextResponse.json({ error: "Template não encontrado" }, { status: 404 })
    }

    // Se está marcando como padrão, desmarcar os outros
    if (updates.isDefault) {
      await query(
        `UPDATE budget_templates
         SET is_default = false
         WHERE company_id = $1::uuid AND id != $2::uuid AND is_default = true`,
        [user.companyId, params.id]
      )
    }

    // Construir query de update dinamicamente
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount}`)
      values.push(updates.name.trim())
      paramCount++
    }

    if (updates.isDefault !== undefined) {
      fields.push(`is_default = $${paramCount}`)
      values.push(updates.isDefault)
      paramCount++
    }

    if (updates.logoUrl !== undefined) {
      fields.push(`logo_url = $${paramCount}`)
      values.push(updates.logoUrl)
      paramCount++
    }

    if (updates.logoPosition !== undefined) {
      fields.push(`logo_position = $${paramCount}`)
      values.push(updates.logoPosition)
      paramCount++
    }

    if (updates.headerText !== undefined) {
      fields.push(`header_text = $${paramCount}`)
      values.push(updates.headerText)
      paramCount++
    }

    if (updates.footerText !== undefined) {
      fields.push(`footer_text = $${paramCount}`)
      values.push(updates.footerText)
      paramCount++
    }

    if (updates.styles !== undefined) {
      fields.push(`styles = $${paramCount}`)
      values.push(JSON.stringify(updates.styles))
      paramCount++
    }

    if (updates.active !== undefined) {
      fields.push(`active = $${paramCount}`)
      values.push(updates.active)
      paramCount++
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

    // Adicionar ID ao final
    values.push(params.id)
    values.push(user.companyId)

    const result = await query(
      `UPDATE budget_templates
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${paramCount}::uuid AND company_id = $${paramCount + 1}::uuid
       RETURNING id, company_id as "companyId", name, is_default as "isDefault",
                 logo_url as "logoUrl", logo_position as "logoPosition",
                 header_text as "headerText", footer_text as "footerText",
                 styles, active, created_by as "createdBy",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      values
    )

    return NextResponse.json({ template: result.rows[0] })
  } catch (error) {
    console.error('Error updating budget template:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Apenas master e administrator podem deletar templates
    if (user.role !== 'master' && user.role !== 'administrator') {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    // Verificar se há orçamentos usando este template
    const budgetsUsingTemplate = await query(
      `SELECT COUNT(*) as count FROM budgets WHERE template_id = $1::uuid`,
      [params.id]
    )

    if (parseInt(budgetsUsingTemplate.rows[0].count) > 0) {
      return NextResponse.json(
        { error: "Não é possível deletar um template que está sendo usado em orçamentos" },
        { status: 400 }
      )
    }

    const result = await query(
      `DELETE FROM budget_templates
       WHERE id = $1::uuid AND company_id = $2::uuid
       RETURNING id`,
      [params.id, user.companyId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Template não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget template:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}
