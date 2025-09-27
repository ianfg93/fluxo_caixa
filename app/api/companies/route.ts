import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    let sql = "SELECT * FROM companies"
    let params: any[] = []

    if (user.role !== 'master') {
      sql += " WHERE id = $1"
      params.push(user.companyId)
    }

    sql += " ORDER BY created_at DESC"

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
      subscriptionExpiresAt: row.subscription_expires_at,
      maxUsers: row.max_users,
      maxTransactionsPerMonth: row.max_transactions_per_month,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ companies })
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

    if (!ApiAuthService.hasPermission(user, 'create_company')) {
      return NextResponse.json({ error: "Sem permissão para criar empresas" }, { status: 403 })
    }

    const companyData = await request.json()

    if (!companyData.cnpj && !companyData.cpf) {
      return NextResponse.json({ error: "CNPJ ou CPF é obrigatório" }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO companies 
       (name, trade_name, cnpj, cpf, email, phone, address, city, state, zip_code, 
        subscription_plan, subscription_expires_at, max_users, max_transactions_per_month, 
        settings, active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) 
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
        companyData.subscriptionPlan || 'basic',
        companyData.subscriptionExpiresAt || null,
        companyData.maxUsers || 5,
        companyData.maxTransactionsPerMonth || 1000,
        JSON.stringify(companyData.settings || {}),
        true
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
      subscriptionPlan: row.subscription_plan,
      subscriptionExpiresAt: row.subscription_expires_at,
      maxUsers: row.max_users,
      maxTransactionsPerMonth: row.max_transactions_per_month,
      settings: row.settings,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }

    return NextResponse.json({ company: newCompany })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}