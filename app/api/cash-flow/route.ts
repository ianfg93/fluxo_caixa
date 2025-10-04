import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!ApiAuthService.hasPermission(user, 'view_company') && !ApiAuthService.hasPermission(user, 'view_all_companies')) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")
    const companyFilter = searchParams.get("company")

    let baseQuery = `
      SELECT 
        cft.id,
        cft.type,
        cft.description,
        cft.amount,
        cft.category,
        cft.transaction_date,
        cft.notes,
        cft.payment_method,
        cft.created_by,
        cft.created_at,
        u.name as created_by_name
      FROM cash_flow_transactions cft
      LEFT JOIN users u ON cft.created_by = u.id
    `

    let queryParams: any[] = []
    let whereConditions: string[] = []

    const targetCompanyId = companyFilter || user.companyId
    if (targetCompanyId) {
      whereConditions.push(`cft.company_id = $${queryParams.length + 1}::uuid`)
      queryParams.push(targetCompanyId)
    }

    if (type) {
      whereConditions.push(`cft.type = $${queryParams.length + 1}::varchar`)
      queryParams.push(type)
    }

    let finalQuery = baseQuery
    if (whereConditions.length > 0) {
      finalQuery += ` WHERE ${whereConditions.join(' AND ')}`
    }
    finalQuery += ` ORDER BY cft.transaction_date DESC, cft.created_at DESC`

    const result = await query(finalQuery, queryParams)

    const transactions = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      description: row.description,
      amount: Number.parseFloat(row.amount),
      category: row.category,
      date: row.transaction_date,
      createdBy: row.created_by_name || 'Usuário não encontrado',
      createdAt: row.created_at,
      notes: row.notes,
      paymentMethod: row.payment_method,
    }))

    return NextResponse.json({ transactions })
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

    if (!ApiAuthService.hasPermission(user, 'create_entries')) {
      return NextResponse.json({ error: "Sem permissão para criar transações" }, { status: 403 })
    }

    const transaction = await request.json()

    // Validar payment_method se fornecido
    if (transaction.paymentMethod && !['credito', 'debito', 'pix', 'dinheiro'].includes(transaction.paymentMethod)) {
      return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 })
    }

    // NOVO: Suporte para múltiplos produtos
    const products = transaction.products || []
    
    if (products.length > 0) {
      // Validar todos os produtos antes de processar
      for (const product of products) {
        if (!product.productId || !product.quantity || product.quantity <= 0) {
          return NextResponse.json({ error: "Dados inválidos de produto" }, { status: 400 })
        }

        // Verificar estoque disponível
        const productCheck = await query(
          "SELECT id, name, quantity FROM products WHERE id = $1 AND company_id = $2",
          [product.productId, user.companyId]
        )

        if (productCheck.rows.length === 0) {
          return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
        }

        if (productCheck.rows[0].quantity < product.quantity) {
          return NextResponse.json({ 
            error: `Estoque insuficiente para ${productCheck.rows[0].name}. Disponível: ${productCheck.rows[0].quantity}` 
          }, { status: 400 })
        }
      }
    }

    // Iniciar transação SQL
    await query("BEGIN")

    try {
      // Criar a transação principal
      const result = await query(
        `INSERT INTO cash_flow_transactions 
         (company_id, type, description, amount, category, transaction_date, created_by, notes, payment_method) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
         RETURNING *`,
        [
          user.companyId,
          transaction.type,
          transaction.description,
          transaction.amount,
          transaction.category,
          transaction.date,
          user.id,
          transaction.notes || null,
          transaction.paymentMethod || null,
        ],
      )

      const transactionId = result.rows[0].id

      // Processar produtos se houver
      if (products.length > 0) {
        for (const product of products) {
          // Diminuir estoque
          await query(
            "UPDATE products SET quantity = quantity - $1 WHERE id = $2",
            [product.quantity, product.productId]
          )

          // Registrar movimentação de estoque
          await query(
            `INSERT INTO stock_movements 
             (product_id, transaction_id, quantity, type, created_by)
             VALUES ($1, $2, $3, 'sale', $4)`,
            [product.productId, transactionId, -product.quantity, user.id]
          )
        }
      }

      // Confirmar transação
      await query("COMMIT")

      const row = result.rows[0]
      const newTransaction = {
        id: row.id,
        type: row.type,
        description: row.description,
        amount: Number.parseFloat(row.amount),
        category: row.category,
        date: row.transaction_date,
        createdBy: user.name,
        createdAt: row.created_at,
        notes: row.notes,
        paymentMethod: row.payment_method,
      }

      return NextResponse.json({ transaction: newTransaction })
    } catch (error) {
      // Reverter em caso de erro
      await query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}