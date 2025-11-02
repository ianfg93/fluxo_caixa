import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

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

    // Buscar NF-e com todos os detalhes
    const invoiceResult = await query(
      `SELECT
        n.id,
        n.nfe_number as "nfeNumber",
        n.nfe_series as "nfeSeries",
        n.nfe_access_key as "nfeAccessKey",
        n.nfe_protocol as "nfeProtocol",
        n.issue_date as "issueDate",
        n.receipt_date as "receiptDate",
        n.total_products as "totalProducts",
        n.total_tax as "totalTax",
        n.freight_value as "freightValue",
        n.insurance_value as "insuranceValue",
        n.discount_value as "discountValue",
        n.other_expenses as "otherExpenses",
        n.total_invoice as "totalInvoice",
        n.payment_status as "paymentStatus",
        n.payment_method as "paymentMethod",
        n.payment_terms as "paymentTerms",
        n.installments,
        n.first_due_date as "firstDueDate",
        n.icms_value as "icmsValue",
        n.ipi_value as "ipiValue",
        n.pis_value as "pisValue",
        n.cofins_value as "cofinsValue",
        n.operation_type as "operationType",
        n.cfop,
        n.notes,
        n.stock_updated as "stockUpdated",
        n.stock_updated_at as "stockUpdatedAt",
        n.accounts_payable_created as "accountsPayableCreated",
        n.status,
        n.cancellation_reason as "cancellationReason",
        n.cancelled_at as "cancelledAt",
        n.company_id as "companyId",
        n.vendor_id as "vendorId",
        n.created_by as "createdBy",
        n.created_at as "createdAt",
        n.updated_at as "updatedAt",
        v.name as "vendorName",
        v.cnpj as "vendorCnpj",
        v.email as "vendorEmail",
        v.phone as "vendorPhone",
        v.address as "vendorAddress",
        u.name as "createdByName"
      FROM nfe_invoices n
      INNER JOIN vendors v ON n.vendor_id = v.id
      INNER JOIN users u ON n.created_by = u.id
      WHERE n.id = $1 AND n.company_id = $2`,
      [id, user.companyId]
    )

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ error: "NF-e não encontrada" }, { status: 404 })
    }

    // Buscar itens da NF-e
    const itemsResult = await query(
      `SELECT
        i.id,
        i.item_number as "itemNumber",
        i.product_code as "productCode",
        i.product_description as "productDescription",
        i.unit,
        i.quantity,
        i.unit_price as "unitPrice",
        i.total_price as "totalPrice",
        i.discount,
        i.icms_percentage as "icmsPercentage",
        i.icms_value as "icmsValue",
        i.ipi_percentage as "ipiPercentage",
        i.ipi_value as "ipiValue",
        i.ncm,
        i.cest,
        i.cfop,
        i.notes,
        i.product_id as "productId",
        p.name as "productName",
        p.code as "productInternalCode"
      FROM nfe_items i
      INNER JOIN products p ON i.product_id = p.id
      WHERE i.nfe_invoice_id = $1
      ORDER BY i.item_number`,
      [id]
    )

    const invoice = {
      ...invoiceResult.rows[0],
      items: itemsResult.rows
    }

    return NextResponse.json({ invoice })
  } catch (error) {
    console.error('Error fetching NFe:', error)
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
    const { reason } = await request.json()

    if (!reason || reason.trim() === '') {
      return NextResponse.json({ error: "Motivo do cancelamento é obrigatório" }, { status: 400 })
    }

    // Verificar se a NF-e existe e pertence à empresa do usuário
    const checkResult = await query(
      `SELECT id, status, stock_updated FROM nfe_invoices
       WHERE id = $1 AND company_id = $2`,
      [id, user.companyId]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "NF-e não encontrada" }, { status: 404 })
    }

    if (checkResult.rows[0].status === 'cancelled') {
      return NextResponse.json({ error: "NF-e já está cancelada" }, { status: 400 })
    }

    await query('BEGIN')

    try {
      // Se o estoque foi atualizado, precisamos reverter
      if (checkResult.rows[0].stock_updated) {
        // Buscar itens para reverter estoque
        const itemsResult = await query(
          `SELECT ni.product_id, ni.quantity, p.name as product_name, p.quantity as current_quantity
           FROM nfe_items ni
           INNER JOIN products p ON ni.product_id = p.id
           WHERE ni.nfe_invoice_id = $1`,
          [id]
        )

        // Validar se há estoque suficiente antes de reverter
        for (const item of itemsResult.rows) {
          const quantityToRemove = Math.floor(parseFloat(item.quantity))
          if (item.current_quantity < quantityToRemove) {
            await query('ROLLBACK')
            return NextResponse.json({
              error: `Não é possível cancelar a NF-e. O produto "${item.product_name}" possui apenas ${item.current_quantity} unidades em estoque, mas a nota fiscal possui ${quantityToRemove} unidades. Ajuste o estoque manualmente antes de cancelar.`
            }, { status: 400 })
          }
        }

        // Reverter estoque de cada produto
        for (const item of itemsResult.rows) {
          const quantityToRemove = Math.floor(parseFloat(item.quantity))

          await query(
            `UPDATE products
             SET quantity = quantity - $1
             WHERE id = $2`,
            [quantityToRemove, item.product_id]
          )

          // Registrar movimento de estoque
          await query(
            `INSERT INTO stock_movements (
              product_id, quantity, type, notes, created_by
            ) VALUES ($1, $2, 'adjustment', $3, $4)`,
            [
              item.product_id,
              -quantityToRemove,
              'Cancelamento de NF-e: ' + reason,
              user.id
            ]
          )
        }
      }

      // Excluir contas a pagar relacionadas (somente as pendentes)
      await query(
        `DELETE FROM accounts_payable
         WHERE nfe_invoice_id = $1 AND status = 'pending'`,
        [id]
      )

      // Excluir transação de fluxo de caixa relacionada (se foi pago à vista)
      await query(
        `DELETE FROM cash_flow_transactions
         WHERE description LIKE '%NF-e ' ||
           (SELECT nfe_number || '/' || nfe_series FROM nfe_invoices WHERE id = $1) || '%'
         AND company_id = $2
         AND type = 'exit'
         AND category = 'Compras'`,
        [id, user.companyId]
      )

      // Marcar NF-e como cancelada
      await query(
        `UPDATE nfe_invoices
         SET status = 'cancelled',
             cancellation_reason = $1,
             cancelled_at = NOW(),
             cancelled_by = $2
         WHERE id = $3`,
        [reason, user.id, id]
      )

      await query('COMMIT')

      return NextResponse.json({
        message: "NF-e cancelada com sucesso"
      })

    } catch (error) {
      await query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error cancelling NFe:', error)
    return NextResponse.json({ error: "Erro ao cancelar NF-e" }, { status: 500 })
  }
}
