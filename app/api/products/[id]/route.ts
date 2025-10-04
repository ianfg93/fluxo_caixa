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

    if (user.role !== 'master' && user.role !== 'administrator') {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { id } = params

    let checkQuery = `
      SELECT 
        id,
        code,
        name,
        quantity,
        company_id as "companyId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM products 
      WHERE id = $1
    `
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const result = await query(checkQuery, checkParams)
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ product: result.rows[0] })
  } catch (error) {
    console.error('Error fetching product:', error)
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

    if (user.role !== 'master' && user.role !== 'administrator') {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const updates = await request.json()
    const { id } = params

    // Verificar se o produto existe e pertence à empresa
    let checkQuery = `SELECT id, company_id FROM products WHERE id = $1`
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
    }

    // Validações
    if (updates.name !== undefined && updates.name.trim() === '') {
      return NextResponse.json({ error: "Nome do produto não pode ser vazio" }, { status: 400 })
    }

    if (updates.quantity !== undefined && updates.quantity < 0) {
      return NextResponse.json({ error: "Quantidade não pode ser negativa" }, { status: 400 })
    }

    // Construir query de update dinamicamente
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramCount = 1

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramCount}`)
      updateValues.push(updates.name.trim())
      paramCount++
    }

    if (updates.quantity !== undefined) {
      updateFields.push(`quantity = $${paramCount}`)
      updateValues.push(updates.quantity)
      paramCount++
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const result = await query(
      `UPDATE products 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramCount}
       RETURNING id, code, name, quantity, company_id as "companyId", created_at as "createdAt", updated_at as "updatedAt"`,
      updateValues
    )

    return NextResponse.json({ product: result.rows[0] })
  } catch (error) {
    console.error('Error updating product:', error)
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

    if (user.role !== 'master' && user.role !== 'administrator') {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { id } = params

    let checkQuery = `SELECT id, company_id FROM products WHERE id = $1`
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
    }

    await query("DELETE FROM products WHERE id = $1", [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}