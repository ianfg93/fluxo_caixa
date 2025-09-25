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

    let sql = "SELECT * FROM companies"
    let params: any[] = []

    // Se não for master, só ver sua própria empresa
    if (user.role !== 'master') {
      sql += " WHERE id = $1"
      params.push(user.companyId)
    }

    sql += " ORDER BY name"

    const result = await query(sql, params)

    const companies = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      tradeName: row.trade_name,
      cnpj: row.cnpj,
      cpf: row.cpf,
      email: row.email,
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      active: row.active,
      subscriptionPlan: row.subscription_plan,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ companies })
  } catch (error) {
    console.error("Get companies API error:", error)
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

    // Só master pode criar empresas
    if (!ApiAuthService.hasPermission(user, 'create_company')) {
      return NextResponse.json({ error: "Sem permissão para criar empresas" }, { status: 403 })
    }

    const companyData = await request.json()

    // Validar se tem CNPJ ou CPF
    if (!companyData.cnpj && !companyData.cpf) {
      return NextResponse.json({ error: "CNPJ ou CPF é obrigatório" }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO companies 
       (name, trade_name, cnpj, cpf, email, phone, address, city, state, zip_code, active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        companyData.name,
        companyData.tradeName || null,
        companyData.cnpj || null,
        companyData.cpf || null,
        companyData.email || null,
        companyData.phone || null,
        companyData.address || null,
        companyData.city || null,
        companyData.state || null,
        companyData.zipCode || null,
        true // active
      ]
    )

    const row = result.rows[0]
    const newCompany = {
      id: row.id,
      name: row.name,
      tradeName: row.trade_name,
      cnpj: row.cnpj,
      cpf: row.cpf,
      email: row.email,
      phone: row.phone,
      address: row.address,
      city: row.city,
      state: row.state,
      zipCode: row.zip_code,
      active: row.active,
      createdAt: row.created_at,
    }

    return NextResponse.json({ company: newCompany })
  } catch (error) {
    console.error("Create company API error:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}