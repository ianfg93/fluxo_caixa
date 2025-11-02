import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!ApiAuthService.hasPermission(user, 'manage_company') && !ApiAuthService.hasPermission(user, 'manage_all')) {
      return NextResponse.json({ error: "Sem permissão para editar usuários" }, { status: 403 })
    }

    const userData = await request.json()

    let checkSql = `
      SELECT u.id, u.company_id, u.email as current_email
      FROM users u 
      WHERE u.id = $1
    `
    const checkParams = [params.id]

    if (user.role !== 'master') {
      checkSql += ` AND u.company_id = $2`
      if (user.companyId === null) {
        return NextResponse.json({ error: "ID da empresa do usuário não encontrado" }, { status: 400 })
      }
      checkParams.push(user.companyId)
    }

    const existingUser = await query(checkSql, checkParams)

    if (existingUser.rows.length === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    if (userData.email && userData.email !== existingUser.rows[0].current_email) {
      const emailCheck = await query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [userData.email, params.id]
      )

      if (emailCheck.rows.length > 0) {
        return NextResponse.json({ error: "Email já está em uso" }, { status: 400 })
      }
    }

    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramIndex = 1

    if (userData.name) {
      updateFields.push(`name = $${paramIndex}`)
      updateValues.push(userData.name)
      paramIndex++
    }

    if (userData.email) {
      updateFields.push(`email = $${paramIndex}`)
      updateValues.push(userData.email)
      paramIndex++
    }

    if (userData.role) {
      updateFields.push(`user_type_id = $${paramIndex}`)
      updateValues.push(mapRoleToUserTypeId(userData.role))
      paramIndex++
    }

    if (userData.status !== undefined) {
      updateFields.push(`active = $${paramIndex}`)
      updateValues.push(userData.status === 'active')
      paramIndex++
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(params.id)

    const updateSql = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, active, created_at, updated_at
    `

    const result = await query(updateSql, updateValues)
    const updatedUser = result.rows[0]

    return NextResponse.json({ 
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: userData.role || 'basic',
        status: updatedUser.active ? 'active' : 'inactive',
        createdAt: updatedUser.created_at,
      },
      message: "Usuário atualizado com sucesso"
    })

  } catch (error) {
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

    if (!ApiAuthService.hasPermission(user, 'manage_company') && !ApiAuthService.hasPermission(user, 'manage_all')) {
      return NextResponse.json({ error: "Sem permissão para deletar usuários" }, { status: 403 })
    }

    if (user.id === params.id) {
      return NextResponse.json({ error: "Não é possível deletar seu próprio usuário" }, { status: 400 })
    }

    let checkSql = `SELECT id, name FROM users WHERE id = $1`
    const checkParams = [params.id]

    if (user.role !== 'master') {
      checkSql += ` AND company_id = $2`
      checkParams.push(user.companyId as string)
    }

    const existingUser = await query(checkSql, checkParams)

    if (existingUser.rows.length === 0) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    await query("DELETE FROM users WHERE id = $1", [params.id])

    return NextResponse.json({ 
      message: `Usuário ${existingUser.rows[0].name} deletado com sucesso`
    })

  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}