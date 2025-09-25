import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

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
        ut.name as user_type,
        c.name as company_name
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
      role: row.user_type,
      status: row.active ? "active" : "inactive",
      createdAt: row.created_at,
      companyName: row.company_name,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Get users API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}