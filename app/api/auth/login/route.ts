import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email e senha são obrigatórios" }, { status: 400 })
    }

    // Buscar usuário com dados da empresa e tipo
    const result = await query(`
      SELECT 
        u.id,
        u.email,
        u.name,
        u.active,
        u.company_id,
        u.settings,
        u.created_at,
        ut.name as user_type,
        ut.level as user_level,
        ut.permissions,
        c.name as company_name,
        c.active as company_active,
        c.subscription_plan,
        c.subscription_expires_at
      FROM users u
      INNER JOIN user_types ut ON u.user_type_id = ut.id
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE u.email = $1 
      AND u.password_hash = crypt($2, u.password_hash)
    `, [email, password])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Email ou senha inválidos" }, { status: 401 })
    }

    const userData = result.rows[0]

    // Verificar se usuário está ativo
    if (!userData.active) {
      return NextResponse.json({ 
        error: "Usuário desativado. Entre em contato com o administrador." 
      }, { status: 401 })
    }

    // Verificar se empresa está ativa (exceto para master)
    if (userData.user_type !== 'master' && !userData.company_active) {
      return NextResponse.json({ 
        error: "Empresa desativada. Entre em contato com o suporte." 
      }, { status: 401 })
    }

    // Verificar se assinatura está válida (se aplicável)
    if (userData.subscription_expires_at && new Date(userData.subscription_expires_at) < new Date()) {
      return NextResponse.json({ 
        error: "Assinatura expirada. Entre em contato com o suporte." 
      }, { status: 401 })
    }

    // Atualizar último login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [userData.id])

    // Preparar dados do usuário para retorno
    const user = {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      role: userData.user_type,
      userLevel: userData.user_level,
      companyId: userData.company_id,
      companyName: userData.company_name,
      permissions: userData.permissions || {},
      settings: userData.settings || {},
      createdAt: userData.created_at,
    }

    return NextResponse.json({ user })

  } catch (error) {
    console.error("Login API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}