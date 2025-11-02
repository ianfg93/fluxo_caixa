import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Apenas master e administrator podem visualizar fornecedores
    if (user.role !== 'master' && user.role !== 'administrator') {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const companyFilter = searchParams.get("company")

    let baseQuery = `
      SELECT 
        id,
        company_id as "companyId",
        cnpj,
        name,
        email,
        address,
        phone,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM vendors
    `

    let queryParams: any[] = []
    let whereConditions: string[] = []

    const targetCompanyId = companyFilter || user.companyId
    if (targetCompanyId) {
      whereConditions.push(`company_id = $1::uuid`)
      queryParams.push(targetCompanyId)
    }

    let finalQuery = baseQuery
    if (whereConditions.length > 0) {
      finalQuery += ` WHERE ${whereConditions.join(' AND ')}`
    }
    finalQuery += ` ORDER BY name ASC`

    const result = await query(finalQuery, queryParams)

    return NextResponse.json({ vendors: result.rows })
  } catch (error) {
    console.error("Error fetching vendors:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (user.role !== 'master' && user.role !== 'administrator') {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const vendor = await request.json()

    // Validações
    if (!vendor.cnpj || vendor.cnpj.replace(/\D/g, "").length !== 14) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 })
    }

    if (!vendor.name || vendor.name.trim() === '') {
      return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 })
    }

    // Limpar CNPJ (remover formatação)
    const cleanCNPJ = vendor.cnpj.replace(/\D/g, "")

    // Verificar se CNPJ já existe na empresa
    const existingVendor = await query(
      "SELECT id FROM vendors WHERE company_id = $1 AND cnpj = $2",
      [user.companyId, cleanCNPJ]
    )

    if (existingVendor.rows.length > 0) {
      return NextResponse.json({ error: "CNPJ já cadastrado" }, { status: 400 })
    }

    const result = await query(
      `INSERT INTO vendors 
       (company_id, cnpj, name, email, address, phone) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, company_id as "companyId", cnpj, name, email, address, phone, created_at as "createdAt", updated_at as "updatedAt"`,
      [
        user.companyId,
        cleanCNPJ,
        vendor.name.trim(),
        vendor.email || null,
        vendor.address || null,
        vendor.phone || null,
      ],
    )

    return NextResponse.json({ vendor: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error("Error creating vendor:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}