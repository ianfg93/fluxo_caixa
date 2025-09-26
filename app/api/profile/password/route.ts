import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"
import bcrypt from 'bcryptjs'

export async function PUT(request: NextRequest) {
  try {
    // Autenticar usuário
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    // Validações básicas
    if (!currentPassword) {
      return NextResponse.json({ error: "Senha atual é obrigatória" }, { status: 400 })
    }

    if (!newPassword) {
      return NextResponse.json({ error: "Nova senha é obrigatória" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Nova senha deve ter pelo menos 6 caracteres" }, { status: 400 })
    }

    // Buscar senha atual do usuário
    const userResult = await query(
      "SELECT id, password_hash FROM users WHERE id = $1",
      [user.id]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    const userData = userResult.rows[0]

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userData.password_hash)
    if (!isCurrentPasswordValid) {
      return NextResponse.json({ error: "Senha atual incorreta" }, { status: 400 })
    }

    // Hash da nova senha
    const hashedNewPassword = await bcrypt.hash(newPassword, 10)

    // Atualizar senha
    await query(
      `UPDATE users SET 
       password_hash = $1,
       updated_at = NOW()
       WHERE id = $2`,
      [hashedNewPassword, user.id]
    )

    return NextResponse.json({ 
      message: "Senha alterada com sucesso"
    })

  } catch (error) {
    console.error("Change password API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}