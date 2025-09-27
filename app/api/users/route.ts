import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"
import bcrypt from 'bcryptjs'

function mapUserTypeToRole(userType: string): "basic" | "manager" | "master" {
  switch (userType.toLowerCase()) {
    case 'master':
      return 'master'
    case 'administrator':
      return 'manager'
    case 'operational':
      return 'basic'
    default:
      return 'basic'
  }
}

function mapRoleToUserTypeId(role: string): number {
  switch (role) {
    case 'master':
      return 1
    case 'manager':
      return 2
    case 'basic':
      return 3
    default:
      return 3
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

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
      role: mapUserTypeToRole(row.user_type),
      status: row.active ? "active" : "inactive",
      createdAt: row.created_at,
      lastLogin: row.last_login,
      createdBy: "Sistema",
      companyName: row.company_name,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!ApiAuthService.hasPermission(user, 'manage_company') && !ApiAuthService.hasPermission(user, 'manage_all')) {
      return NextResponse.json({ error: "Sem permissão para criar usuários" }, { status: 403 })
    }

    const userData = await request.json()

    if (!userData.name || !userData.email || !userData.password || !userData.role) {
      return NextResponse.json({ error: "Dados obrigatórios não fornecidos" }, { status: 400 })
    }

    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1",
      [userData.email]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "Email já está em uso" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10)

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
        user.companyId,
        true,
        false
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
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}