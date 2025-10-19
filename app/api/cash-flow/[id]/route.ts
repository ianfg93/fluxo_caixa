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

    const { id } = params

    // Buscar transação
    let transactionQuery = `SELECT * FROM cash_flow_transactions WHERE id = $1`
    let transactionParams: any[] = [id]

    if (user.role !== 'master') {
      transactionQuery += ` AND company_id = $2`
      transactionParams.push(user.companyId!)
    }

    const transactionResult = await query(transactionQuery, transactionParams)

    if (transactionResult.rows.length === 0) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    const transaction = transactionResult.rows[0]

    // Buscar produtos associados através das movimentações de estoque
    const productsResult = await query(
      `SELECT 
        sm.product_id,
        p.name as product_name,
        ABS(sm.quantity) as quantity,
        p.quantity as current_stock
       FROM stock_movements sm
       JOIN products p ON sm.product_id = p.id
       WHERE sm.transaction_id = $1 AND sm.type = 'sale'`,
      [id]
    )

    return NextResponse.json({
      transaction,
      products: productsResult.rows
    })
  } catch (error) {
    console.error("Error fetching transaction:", error)
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

    const canEditAll = ApiAuthService.hasPermission(user, 'edit_all')
    const canEditOwn = ApiAuthService.hasPermission(user, 'edit_own')
    
    if (!canEditAll && !canEditOwn) {
      return NextResponse.json({ error: "Sem permissão para editar transações" }, { status: 403 })
    }

    const updates = await request.json()
    const { id } = params

    // ✅ MODIFICADO: Incluir 'a_prazo' na validação
    if (updates.paymentMethod && !['credito', 'debito', 'pix', 'dinheiro', 'a_prazo'].includes(updates.paymentMethod)) {
      return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 })
    }

    let checkQuery = `
      SELECT id, created_by, company_id 
      FROM cash_flow_transactions 
      WHERE id = $1
    `
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    const transaction = checkResult.rows[0]

    if (!canEditAll && canEditOwn && transaction.created_by !== user.id) {
      return NextResponse.json({ error: "Sem permissão para editar esta transação" }, { status: 403 })
    }

    // Iniciar transação SQL
    await query("BEGIN")

    try {
      // Buscar produtos atuais da transação
      const currentProducts = await query(
        `SELECT 
          sm.id as movement_id,
          sm.product_id,
          ABS(sm.quantity) as quantity
         FROM stock_movements sm
         WHERE sm.transaction_id = $1 AND sm.type = 'sale'`,
        [id]
      )

      // Se houver produtos para ajustar
      if (updates.products && updates.products.length > 0) {
        for (const updatedProduct of updates.products) {
          const currentProduct = currentProducts.rows.find(
            (p: any) => p.product_id === updatedProduct.productId
          )

          if (currentProduct) {
            const oldQuantity = currentProduct.quantity
            const newQuantity = updatedProduct.quantity
            const difference = oldQuantity - newQuantity

            if (difference !== 0) {
              if (difference < 0) {
                const productCheck = await query(
                  "SELECT name, quantity FROM products WHERE id = $1",
                  [updatedProduct.productId]
                )

                if (productCheck.rows.length === 0) {
                  await query("ROLLBACK")
                  return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 })
                }

                if (productCheck.rows[0].quantity < Math.abs(difference)) {
                  await query("ROLLBACK")
                  return NextResponse.json({ 
                    error: `Estoque insuficiente para ${productCheck.rows[0].name}. Disponível: ${productCheck.rows[0].quantity}` 
                  }, { status: 400 })
                }
              }

              await query(
                "UPDATE products SET quantity = quantity + $1 WHERE id = $2",
                [difference, updatedProduct.productId]
              )

              await query(
                "UPDATE stock_movements SET quantity = $1 WHERE id = $2",
                [-newQuantity, currentProduct.movement_id]
              )

              await query(
                `INSERT INTO stock_movements 
                 (product_id, transaction_id, quantity, type, notes, created_by)
                 VALUES ($1, $2, $3, 'adjustment', $4, $5)`,
                [
                  updatedProduct.productId,
                  id,
                  difference,
                  `Ajuste na edição da transação - ${difference > 0 ? 'Devolução' : 'Retirada'} de ${Math.abs(difference)} unidades`,
                  user.id
                ]
              )
            }
          }
        }
      }

      // ✅ MODIFICADO: Atualizar a transação incluindo customer_id e amount_received
      const result = await query(
        `UPDATE cash_flow_transactions 
         SET description = $1, 
             amount = $2, 
             category = $3, 
             transaction_date = $4, 
             notes = $5, 
             payment_method = $6,
             customer_id = $7,
             amount_received = $8,
             updated_at = NOW()
         WHERE id = $9 
         RETURNING *`,
        [
          updates.description,
          updates.amount,
          updates.category,
          updates.date,
          updates.notes,
          updates.paymentMethod || null,
          updates.customerId || null,
          updates.amountReceived !== undefined ? updates.amountReceived : updates.amount,
          id,
        ],
      )

      // Confirmar transação
      await query("COMMIT")

      const row = result.rows[0]
      const updatedTransaction = {
        id: row.id,
        type: row.type,
        description: row.description,
        amount: Number.parseFloat(row.amount),
        category: row.category,
        date: row.transaction_date,
        createdBy: row.created_by,
        createdAt: row.created_at,
        notes: row.notes,
        paymentMethod: row.payment_method,
        customerId: row.customer_id,
        amountReceived: row.amount_received ? Number.parseFloat(row.amount_received) : Number.parseFloat(row.amount),
      }

      return NextResponse.json({ transaction: updatedTransaction })
    } catch (error) {
      await query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error updating transaction:", error)
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

    const canDelete = ApiAuthService.hasPermission(user, 'delete_records') || ApiAuthService.hasPermission(user, 'delete_all')
    
    if (!canDelete) {
      return NextResponse.json({ error: "Sem permissão para deletar transações" }, { status: 403 })
    }

    const { id } = params

    let checkQuery = `
      SELECT id, company_id 
      FROM cash_flow_transactions 
      WHERE id = $1
    `
    let checkParams = [id]

    if (user.role !== 'master') {
      checkQuery += ` AND company_id = $2`
      checkParams.push(user.companyId!)
    }

    const checkResult = await query(checkQuery, checkParams)
    
    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 })
    }

    // Iniciar transação SQL
    await query("BEGIN")

    try {
      // Buscar produtos da transação para devolver ao estoque
      const products = await query(
        `SELECT product_id, ABS(quantity) as quantity
         FROM stock_movements
         WHERE transaction_id = $1 AND type = 'sale'`,
        [id]
      )

      // Devolver produtos ao estoque
      for (const product of products.rows) {
        await query(
          "UPDATE products SET quantity = quantity + $1 WHERE id = $2",
          [product.quantity, product.product_id]
        )

        // Registrar devolução
        await query(
          `INSERT INTO stock_movements 
           (product_id, quantity, type, notes, created_by)
           VALUES ($1, $2, 'adjustment', $3, $4)`,
          [
            product.product_id,
            product.quantity,
            `Devolução por exclusão de transação`,
            user.id
          ]
        )
      }

      // Deletar movimentações de estoque da transação
      await query(
        "DELETE FROM stock_movements WHERE transaction_id = $1",
        [id]
      )

      // Deletar transação
      const result = await query(
        "DELETE FROM cash_flow_transactions WHERE id = $1 RETURNING id",
        [id]
      )

      // Confirmar transação
      await query("COMMIT")

      return NextResponse.json({ success: true, deletedId: result.rows[0].id })
    } catch (error) {
      await query("ROLLBACK")
      throw error
    }
  } catch (error) {
    console.error("Error deleting transaction:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}