import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"
import bcrypt from 'bcryptjs'

// Função para mapear user_type do banco para role do frontend
function mapUserTypeToRole(userType: string): "basic" | "manager" | "master" {
  switch (userType.toLowerCase()) {
    case 'master':
      return 'master'
    case 'administrator':
      return 'manager' // administrator do banco vira manager no frontend
    case 'operational':
      return 'basic' // operational do banco vira basic no frontend
    default:
      return 'basic'
  }
}

// Função para mapear role do frontend para user_type_id do banco
function mapRoleToUserTypeId(role: string): number {
  switch (role) {
    case 'master':
      return 1 // assumindo que master é id 1
    case 'manager':
      return 2 // administrator é id 2
    case 'basic':
      return 3 // operational é id 3
    default:
      return 3
  }
}

export async function GET(request: NextRequest) {
  try {
    // Autenticar usuário
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Apenas master e admin podem ver usuários
    if (!ApiAuthService.hasPermission(user, 'manage_company') && !ApiAuthService.hasPermission(user, 'manage_all')) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    let sql = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.active, 
        u.created_at,
        u.last_login,
        ut.name as user_type,
        COALESCE(c.trade_name, c.name) as company_name
      FROM users u
      INNER JOIN user_types ut ON u.user_type_id = ut.id
      LEFT JOIN companies c ON u.company_id = c.id
    `

    let result
    // Aplicar filtro de empresa se não for master
    if (user.role !== 'master') {
      sql += ` WHERE u.company_id = $1 ORDER BY u.created_at DESC`
      result = await query(sql, [user.companyId])
    } else {
      sql += ` ORDER BY u.created_at DESC`
      result = await query(sql)
    }

    const users = result.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: mapUserTypeToRole(row.user_type), // Mapear user_type para role
      status: row.active ? "active" : "inactive",
      createdAt: row.created_at,
      lastLogin: row.last_login,
      createdBy: "Sistema", // Você pode ajustar isso depois se tiver o campo
      companyName: row.company_name,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Get users API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Autenticar usuário
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Verificar permissão para criar usuários
    if (!ApiAuthService.hasPermission(user, 'manage_company') && !ApiAuthService.hasPermission(user, 'manage_all')) {
      return NextResponse.json({ error: "Sem permissão para criar usuários" }, { status: 403 })
    }

    const userData = await request.json()

    // Validações básicas
    if (!userData.name || !userData.email || !userData.password || !userData.role) {
      return NextResponse.json({ error: "Dados obrigatórios não fornecidos" }, { status: 400 })
    }

    // Verificar se email já existe
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1",
      [userData.email]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "Email já está em uso" }, { status: 400 })
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(userData.password, 10)

    // Criar usuário
    const result = await query(
      `INSERT INTO users 
       (name, email, password_hash, user_type_id, company_id, active, email_verified) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING id, name, email, created_at`,
      [
        userData.name,
        userData.email,
        hashedPassword,
        mapRoleToUserTypeId(userData.role),
        user.companyId, // Usuário criado na mesma empresa do criador
        true, // active
        false // email_verified
      ]
    )

    const newUser = result.rows[0]
    
    return NextResponse.json({ 
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: userData.role,
        status: "active",
        createdAt: newUser.created_at,
        createdBy: user.name
      },
      message: "Usuário criado com sucesso"
    })

  } catch (error) {
    console.error("Create user API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}