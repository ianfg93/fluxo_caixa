import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function PUT(request: NextRequest) {
  try {
    // Autenticar usuário
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const profileData = await request.json()

    // Validações básicas
    if (!profileData.name || !profileData.name.trim()) {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
    }

    // Atualizar perfil do usuário
    const result = await query(
      `UPDATE users SET 
       name = $1,
       updated_at = NOW()
       WHERE id = $2
       RETURNING id, name, email`,
      [profileData.name.trim(), user.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const updatedUser = result.rows[0]

    return NextResponse.json({ 
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email
      },
      message: "Perfil atualizado com sucesso"
    })

  } catch (error) {
    console.error("Update profile API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}