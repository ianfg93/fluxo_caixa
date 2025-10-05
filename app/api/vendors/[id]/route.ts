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
        company_id as "companyId",
        cnpj,
        name,
        email,
        address,
        phone,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM vendors 
      WHERE id = $1
    `
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const result = await query(checkQuery, checkParams)
    
    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })
    }

    return NextResponse.json({ vendor: result.rows[0] })
  } catch (error) {
    console.error('Error fetching vendor:', error)
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

    // Verificar se o fornecedor existe e pertence à empresa
    let checkQuery = `SELECT id, company_id FROM vendors WHERE id = $1`
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })
    }

    // Validações
    if (updates.name !== undefined && updates.name.trim() === '') {
      return NextResponse.json({ error: "Nome não pode ser vazio" }, { status: 400 })
    }

    // Construir query de update dinamicamente
    const updateFields: string[] = []
    const updateValues: any[] = []
    let paramCount = 1

    if (updates.name !== undefined) {
      updateFields.push(`name = ${paramCount}`)
      updateValues.push(updates.name.trim())
      paramCount++
    }

    if (updates.email !== undefined) {
      updateFields.push(`email = ${paramCount}`)
      updateValues.push(updates.email || null)
      paramCount++
    }

    if (updates.address !== undefined) {
      updateFields.push(`address = ${paramCount}`)
      updateValues.push(updates.address || null)
      paramCount++
    }

    if (updates.phone !== undefined) {
      updateFields.push(`phone = ${paramCount}`)
      updateValues.push(updates.phone || null)
      paramCount++
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "Nenhum campo para atualizar" }, { status: 400 })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const result = await query(
      `UPDATE vendors 
       SET ${updateFields.join(', ')}
       WHERE id = ${paramCount}
       RETURNING id, company_id as "companyId", cnpj, name, email, address, phone, created_at as "createdAt", updated_at as "updatedAt"`,
      updateValues
    )

    return NextResponse.json({ vendor: result.rows[0] })
  } catch (error) {
    console.error('Error updating vendor:', error)
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

    let checkQuery = `SELECT id, company_id FROM vendors WHERE id = $1`
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Fornecedor não encontrado" }, { status: 404 })
    }

    // Verificar se há contas a pagar vinculadas
    const accountsCheck = await query(
      "SELECT COUNT(*) as count FROM accounts_payable WHERE vendor_id = $1",
      [id]
    )

    if (parseInt(accountsCheck.rows[0].count) > 0) {
      return NextResponse.json({ 
        error: "Não é possível excluir. Existem contas a pagar vinculadas a este fornecedor." 
      }, { status: 400 })
    }

    await query("DELETE FROM vendors WHERE id = $1", [id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}