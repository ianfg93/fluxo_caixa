import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (user.role !== 'master' && user.companyId !== params.id) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const result = await query(
      "SELECT * FROM companies WHERE id = $1",
      [params.id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    const row = result.rows[0]
    const company = {
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

    return NextResponse.json({ company })
  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
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

    if (!ApiAuthService.hasPermission(user, 'create_company')) {
      return NextResponse.json({ error: "Sem permissão para editar empresas" }, { status: 403 })
    }

    const companyData = await request.json()

    if (!companyData.name) {
      return NextResponse.json({ error: "Nome da empresa é obrigatório" }, { status: 400 })
    }

    if (!companyData.cnpj && !companyData.cpf) {
      return NextResponse.json({ error: "CNPJ ou CPF é obrigatório" }, { status: 400 })
    }

    const existingCompany = await query(
      "SELECT id FROM companies WHERE id = $1",
      [params.id]
    )

    if (existingCompany.rows.length === 0) {
      return NextResponse.json({ error: "Empresa não encontrada" }, { status: 404 })
    }

    const result = await query(
      `UPDATE companies SET 
       name = $1,
       trade_name = $2,
       cnpj = $3,
       cpf = $4,
       email = $5,
       phone = $6,
       address = $7,
       city = $8,
       state = $9,
       zip_code = $10,
       subscription_plan = $11,
       subscription_expires_at = $12,
       max_users = $13,
       max_transactions_per_month = $14,
       active = $15,
       updated_at = NOW()
       WHERE id = $16
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
        companyData.active ?? true,
        params.id
      ]
    )

    const row = result.rows[0]
    const updatedCompany = {
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

    return NextResponse.json({ 
      company: updatedCompany,
      message: "Empresa atualizada com sucesso"
    })

  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}