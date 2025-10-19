import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  console.log('=== GET /api/products INICIOU ===')
  
  try {
    console.log('1. Autenticando...')
    const user = await ApiAuthService.authenticateRequest(request)
    
    if (!user) {
      console.log('Usuário não autenticado')
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }
    
    console.log('2. Usuário:', user.name, 'Role:', user.role)
    
    if (user.role !== 'master' && user.role !== 'administrator') {
      console.log('Sem permissão')
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    console.log('3. Montando query...')
    const { searchParams } = new URL(request.url)
    const companyFilter = searchParams.get("company")

    let baseQuery = `
      SELECT 
        id, code, name, price, quantity, barcode,
        company_id as "companyId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM products
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
    finalQuery += ` ORDER BY code ASC`

    console.log('4. Query:', finalQuery)
    console.log('5. Params:', queryParams)

    console.log('6. Executando query...')
    const result = await query(finalQuery, queryParams)
    
    console.log('7. Sucesso! Produtos:', result.rows.length)

    return NextResponse.json({ products: result.rows })
  } catch (error) {
    console.error('ERRO NO GET:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== POST /api/products ===')
    const user = await ApiAuthService.authenticateRequest(request)
    console.log('User:', user?.name, 'Company:', user?.companyId)
    
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Apenas master e administrator podem criar produtos
    if (user.role !== 'master' && user.role !== 'administrator') {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const product = await request.json()
    console.log('Product data:', product)

    // Validações
    if (!product.name || product.name.trim() === '') {
      return NextResponse.json({ error: "Nome do produto é obrigatório" }, { status: 400 })
    }

    if (product.quantity === undefined || product.quantity < 0) {
      return NextResponse.json({ error: "Quantidade inválida" }, { status: 400 })
    }

    // Validar preço
    const price = product.price !== undefined ? parseFloat(product.price) : 0
    if (price < 0) {
      return NextResponse.json({ error: "Preço não pode ser negativo" }, { status: 400 })
    }

    console.log('Executando INSERT com price:', price, 'barcode:', product.barcode)
    const result = await query(
      `INSERT INTO products 
       (company_id, name, price, quantity, barcode) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, code, name, price, quantity, barcode, company_id as "companyId", created_at as "createdAt", updated_at as "updatedAt"`,
      [
        user.companyId,
        product.name.trim(),
        price,
        product.quantity,
        product.barcode || null,
      ]
    )
    console.log('Produto criado:', result.rows[0])

    return NextResponse.json({ product: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('ERRO COMPLETO:', error)
    console.error('Error creating product:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}