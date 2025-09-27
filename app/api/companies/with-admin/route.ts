import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!ApiAuthService.hasPermission(user, 'create_company')) {
      return NextResponse.json({ error: "Sem permissão para criar empresas" }, { status: 403 })
    }

    const { company: companyData, admin: adminData } = await request.json()

    if (!companyData.name) {
      return NextResponse.json({ error: "Nome da empresa é obrigatório" }, { status: 400 })
    }

    if (!companyData.cnpj && !companyData.cpf) {
      return NextResponse.json({ error: "CNPJ ou CPF é obrigatório" }, { status: 400 })
    }

    if (!adminData.name || !adminData.email || !adminData.password) {
      return NextResponse.json({ error: "Dados do administrador são obrigatórios" }, { status: 400 })
    }

    const emailRegex = /\S+@\S+\.\S+/
    if (!emailRegex.test(adminData.email)) {
      return NextResponse.json({ error: "Email do administrador inválido" }, { status: 400 })
    }

    const existingUser = await query(
      "SELECT id FROM users WHERE email = $1",
      [adminData.email]
    )

    if (existingUser.rows.length > 0) {
      return NextResponse.json({ error: "Email do administrador já está em uso" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(adminData.password, 10)

    await query("BEGIN")

    try {
      const companyResult = await query(
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

      const companyRow = companyResult.rows[0]

      const adminResult = await query(
        `INSERT INTO users 
         (name, email, password_hash, user_type_id, company_id, active, email_verified) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, name, email`,
        [
          adminData.name,
          adminData.email,
          hashedPassword,
          2,
          companyRow.id,
          true,
          false
        ]
      )

      const adminRow = adminResult.rows[0]

      await query("COMMIT")

      const newCompany = {
        id: companyRow.id,
        name: companyRow.name,
        tradeName: companyRow.trade_name,
        cnpj: companyRow.cnpj,
        cpf: companyRow.cpf,
        email: companyRow.email,
        phone: companyRow.phone,
        address: companyRow.address,
        city: companyRow.city,
        state: companyRow.state,
        zipCode: companyRow.zip_code,
        active: companyRow.active,
        subscriptionPlan: companyRow.subscription_plan,
        subscriptionExpiresAt: companyRow.subscription_expires_at,
        maxUsers: companyRow.max_users,
        maxTransactionsPerMonth: companyRow.max_transactions_per_month,
        settings: companyRow.settings,
        createdAt: companyRow.created_at,
        updatedAt: companyRow.updated_at,
      }

      const newAdmin = {
        id: adminRow.id,
        name: adminRow.name,
        email: adminRow.email,
      }

      return NextResponse.json({ 
        company: newCompany,
        admin: newAdmin,
        message: "Empresa e usuário administrador criados com sucesso"
      })

    } catch (transactionError) {
      await query("ROLLBACK")
      throw transactionError
    }

  } catch (error) {
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}