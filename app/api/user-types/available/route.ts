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

    // Buscar o tipo de usuário atual
    const currentUserTypeResult = await query(
      "SELECT name, level FROM user_types WHERE id = (SELECT user_type_id FROM users WHERE id = $1)",
      [user.id]
    )

    if (currentUserTypeResult.rows.length === 0) {
      return NextResponse.json({ error: "Tipo de usuário não encontrado" }, { status: 400 })
    }

    const currentUserType = currentUserTypeResult.rows[0]
    let availableTypes = []

    if (currentUserType.name === 'master') {
      // Master pode criar todos os tipos
      const result = await query("SELECT * FROM user_types ORDER BY level ASC")
      availableTypes = result.rows
    } else if (currentUserType.name === 'administrator') {
      // Admin pode criar administrator e operational
      const result = await query("SELECT * FROM user_types WHERE name IN ('administrator', 'operational') ORDER BY level ASC")
      availableTypes = result.rows
    }
    // Operational não pode criar usuários, então retorna array vazio

    return NextResponse.json(availableTypes)

  } catch (error) {
    console.error("Erro ao buscar tipos de usuário:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}