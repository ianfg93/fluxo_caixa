import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"
import bcrypt from 'bcryptjs'

function mapUserTypeToRole(userType: string): "operational" | "administrator" | "master" {
  switch (userType.toLowerCase()) {
    case 'master':
      return 'master'
    case 'administrator':
      return 'administrator'
    case 'operational':
      return 'operational'
    default:
      return 'operational'
  }
}

function mapRoleToUserTypeId(role: string): number {
  switch (role) {
    case 'master':
      return 1
    case 'administrator':
      return 2
    case 'operational':
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
        u.user_type_id,
        u.company_id,
        ut.name as user_type,
        COALESCE(c.trade_name, c.name) as company_name
      FROM users u
      INNER JOIN user_types ut ON u.user_type_id = ut.id
      LEFT JOIN companies c ON u.company_id = c.id
    `

    let result
    if (user.role !== 'master') {
      // Usuários admin/operacional só veem usuários da própria empresa
      sql += ` WHERE u.company_id = $1 ORDER BY u.created_at DESC`
      result = await query(sql, [user.companyId])
    } else {
      // Usuário master vê todos os usuários
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
      user_type_id: row.user_type_id,
      company_id: row.company_id,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Erro ao buscar usuários:", error)
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

    // Verificar se o email já existe
    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1",
      [userData.email]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "Email já está em uso" }, { status: 400 })
    }

    // Buscar informações do tipo de usuário atual para validações
    const currentUserTypeResult = await query(
      "SELECT name, level FROM user_types WHERE id = (SELECT user_type_id FROM users WHERE id = $1)",
      [user.id]
    )

    if (currentUserTypeResult.rows.length === 0) {
      return NextResponse.json({ error: "Tipo de usuário atual não encontrado" }, { status: 400 })
    }

    const currentUserType = currentUserTypeResult.rows[0]
    const targetUserTypeId = mapRoleToUserTypeId(userData.role)

    // Buscar informações do tipo de usuário a ser criado
    const targetUserTypeResult = await query(
      "SELECT name, level FROM user_types WHERE id = $1",
      [targetUserTypeId]
    )

    if (targetUserTypeResult.rows.length === 0) {
      return NextResponse.json({ error: "Tipo de usuário inválido" }, { status: 400 })
    }

    const targetUserType = targetUserTypeResult.rows[0]

    // Validações de permissão
    if (currentUserType.name === 'operational') {
      return NextResponse.json({ error: "Usuários operacionais não podem criar usuários" }, { status: 403 })
    }

    if (currentUserType.name === 'administrator' && targetUserType.name === 'master') {
      return NextResponse.json({ error: "Administradores não podem criar usuários master" }, { status: 403 })
    }

    if (targetUserType.name === 'master' && currentUserType.name !== 'master') {
      return NextResponse.json({ error: "Apenas usuários master podem criar outros masters" }, { status: 403 })
    }

    // Determinar a empresa para o novo usuário
    let companyId: string | null = null

    if (userData.company_id && user.role === 'master') {
      // Usuário master pode escolher a empresa
      companyId = userData.company_id
      
      // Verificar se a empresa existe
      const companyExists = await query("SELECT id FROM companies WHERE id = $1", [userData.company_id])
      if (companyExists.rows.length === 0) {
        return NextResponse.json({ error: "Empresa não encontrada" }, { status: 400 })
      }
    } else {
      // Usuários admin/operacional criam na própria empresa
      companyId = user.companyId
    }

    if (!companyId) {
      return NextResponse.json({ error: "Usuário não possui empresa associada" }, { status: 400 })
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
        targetUserTypeId,
        companyId,
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
        createdBy: user.name,
        user_type_id: targetUserTypeId,
        company_id: companyId
      },
      message: "Usuário criado com sucesso"
    })

  } catch (error) {
    console.error("Erro ao criar usuário:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}