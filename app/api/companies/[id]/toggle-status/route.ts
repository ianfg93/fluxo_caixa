import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Autenticar usuário
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Só master pode alterar status de empresas
    if (!ApiAuthService.hasPermission(user, 'create_company')) {
      return NextResponse.json({ error: "Sem permissão para alterar status de empresas" }, { status: 403 })
    }

    // Verificar se empresa existe e obter status atual
    const existingCompany = await query(
      "SELECT id, active, name FROM companies WHERE id = $1",
      [params.id]
    )

    if (existingCompany.rows.length === 0) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    const currentStatus = existingCompany.rows[0].active
    const newStatus = !currentStatus
    const companyName = existingCompany.rows[0].name

    // Atualizar status
    const result = await query(
      `UPDATE companies SET 
       active = $1,
       updated_at = NOW()
       WHERE id = $2
       RETURNING active`,
      [newStatus, params.id]
    )

    return NextResponse.json({ 
      success: true,
      active: result.rows[0].active,
      message: `Empresa "${companyName}" ${newStatus ? 'ativada' : 'desativada'} com sucesso`
    })

  } catch (error) {
    console.error("Toggle company status API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}