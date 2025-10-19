import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const result = await query(
      `
      SELECT 
        c.*,
        COALESCE(SUM(CASE 
          WHEN t.type = 'entry' 
            AND t.customer_id = c.id 
            AND COALESCE(t.amount_received, 0) = 0 
          THEN t.amount 
          ELSE 0 
        END), 0) as total_debt,
        COALESCE(SUM(CASE 
          WHEN t.type = 'entry' 
            AND t.customer_id = c.id 
            AND COALESCE(t.amount_received, 0) > 0 
          THEN t.amount_received 
          ELSE 0 
        END), 0) as total_paid,
        COALESCE(SUM(CASE 
          WHEN t.type = 'entry' 
            AND t.customer_id = c.id 
            AND COALESCE(t.amount_received, 0) = 0 
          THEN t.amount 
          ELSE 0 
        END), 0) - COALESCE(SUM(CASE 
          WHEN t.type = 'entry' 
            AND t.customer_id = c.id 
            AND COALESCE(t.amount_received, 0) > 0 
          THEN t.amount_received 
          ELSE 0 
        END), 0) as balance
      FROM customers c
      LEFT JOIN cash_flow_transactions t ON t.customer_id = c.id
      WHERE c.id = $1 AND c.company_id = $2
      GROUP BY c.id
      `,
      [params.id, user.companyId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    const row = result.rows[0]
    const customer = {
      id: row.id,
      companyId: row.company_id,
      name: row.name,
      cpfCnpj: row.cpf_cnpj,
      phone: row.phone,
      email: row.email,
      address: row.address,
      active: row.active,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalDebt: parseFloat(row.total_debt || 0),
      totalPaid: parseFloat(row.total_paid || 0),
      balance: parseFloat(row.balance || 0),
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Erro ao buscar cliente:", error)
    return NextResponse.json({ error: "Erro ao buscar cliente" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, cpfCnpj, phone, email, address, active } = body

    // Verificar se o cliente existe e pertence à empresa do usuário
    const checkResult = await query(
      "SELECT id FROM customers WHERE id = $1 AND company_id = $2",
      [params.id, user.companyId]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`)
      values.push(name.trim())
      paramIndex++
    }
    if (cpfCnpj !== undefined) {
      updates.push(`cpf_cnpj = $${paramIndex}`)
      values.push(cpfCnpj || null)
      paramIndex++
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`)
      values.push(phone || null)
      paramIndex++
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`)
      values.push(email || null)
      paramIndex++
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex}`)
      values.push(address || null)
      paramIndex++
    }
    if (active !== undefined) {
      updates.push(`active = $${paramIndex}`)
      values.push(active)
      paramIndex++
    }

    updates.push(`updated_at = NOW()`)

    values.push(params.id)

    const result = await query(
      `
      UPDATE customers
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
      `,
      values
    )

    const customer = {
      id: result.rows[0].id,
      companyId: result.rows[0].company_id,
      name: result.rows[0].name,
      cpfCnpj: result.rows[0].cpf_cnpj,
      phone: result.rows[0].phone,
      email: result.rows[0].email,
      address: result.rows[0].address,
      active: result.rows[0].active,
      createdBy: result.rows[0].created_by,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Erro ao atualizar cliente:", error)
    return NextResponse.json({ error: "Erro ao atualizar cliente" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!ApiAuthService.hasPermission(user, "delete_records")) {
      return NextResponse.json({ error: "Sem permissão para deletar clientes" }, { status: 403 })
    }

    // Verificar se o cliente existe e pertence à empresa do usuário
    const checkResult = await query(
      "SELECT id FROM customers WHERE id = $1 AND company_id = $2",
      [params.id, user.companyId]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    // Verificar se há transações vinculadas
    const transactionsCheck = await query(
      "SELECT COUNT(*) as count FROM cash_flow_transactions WHERE customer_id = $1",
      [params.id]
    )

    if (parseInt(transactionsCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { error: "Não é possível excluir cliente com transações vinculadas" },
        { status: 400 }
      )
    }

    await query("DELETE FROM customers WHERE id = $1", [params.id])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erro ao deletar cliente:", error)
    return NextResponse.json({ error: "Erro ao deletar cliente" }, { status: 500 })
  }
}