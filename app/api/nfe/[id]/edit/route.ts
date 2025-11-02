import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

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

    const { id } = params
    const data = await request.json()

    console.log('=== PUT /api/nfe/[id]/edit ===')
    console.log('ID:', id)
    console.log('Data:', data)

    // Verificar se a NF-e existe e pertence à empresa do usuário
    const checkResult = await query(
      `SELECT id, stock_updated, accounts_payable_created FROM nfe_invoices
       WHERE id = $1 AND company_id = $2`,
      [id, user.companyId]
    )

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: "NF-e não encontrada" }, { status: 404 })
    }

    const currentInvoice = checkResult.rows[0]

    // Não permitir edição se já processou estoque ou contas a pagar
    if (currentInvoice.stock_updated || currentInvoice.accounts_payable_created) {
      return NextResponse.json({
        error: "Não é possível editar uma NF-e que já teve estoque ou contas a pagar processados. Cancele e crie uma nova."
      }, { status: 400 })
    }

    await query('BEGIN')

    try {
      // Atualizar dados da NF-e
      await query(
        `UPDATE nfe_invoices SET
          vendor_id = $1,
          nfe_number = $2,
          nfe_series = $3,
          nfe_access_key = $4,
          nfe_protocol = $5,
          issue_date = $6,
          receipt_date = $7,
          total_products = $8,
          total_tax = $9,
          freight_value = $10,
          insurance_value = $11,
          discount_value = $12,
          other_expenses = $13,
          total_invoice = $14,
          payment_status = $15,
          payment_method = $16,
          payment_terms = $17,
          installments = $18,
          first_due_date = $19,
          icms_value = $20,
          ipi_value = $21,
          pis_value = $22,
          cofins_value = $23,
          operation_type = $24,
          cfop = $25,
          notes = $26,
          updated_at = NOW()
         WHERE id = $27`,
        [
          data.vendorId,
          data.nfeNumber,
          data.nfeSeries,
          data.nfeAccessKey || null,
          data.nfeProtocol || null,
          data.issueDate,
          data.receiptDate,
          data.totalProducts || 0,
          data.totalTax || 0,
          data.freightValue || 0,
          data.insuranceValue || 0,
          data.discountValue || 0,
          data.otherExpenses || 0,
          data.totalInvoice,
          data.paymentStatus,
          data.paymentMethod || null,
          data.paymentTerms || null,
          data.installments || 1,
          data.firstDueDate || null,
          data.icmsValue || 0,
          data.ipiValue || 0,
          data.pisValue || 0,
          data.cofinsValue || 0,
          data.operationType || 'purchase',
          data.cfop || null,
          data.notes || null,
          id
        ]
      )

      // Deletar itens antigos
      await query(`DELETE FROM nfe_items WHERE nfe_invoice_id = $1`, [id])

      // Inserir novos itens
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i]
        await query(
          `INSERT INTO nfe_items (
            nfe_invoice_id, product_id, item_number, product_code, product_description,
            unit, quantity, unit_price, total_price, discount,
            icms_percentage, icms_value, ipi_percentage, ipi_value,
            ncm, cest, cfop, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
          )`,
          [
            id,
            item.productId,
            i + 1,
            item.productCode || null,
            item.productDescription,
            item.unit || 'UN',
            item.quantity,
            item.unitPrice,
            item.totalPrice,
            item.discount || 0,
            item.icmsPercentage || 0,
            item.icmsValue || 0,
            item.ipiPercentage || 0,
            item.ipiValue || 0,
            item.ncm || null,
            item.cest || null,
            item.cfop || null,
            item.notes || null
          ]
        )
      }

      await query('COMMIT')

      return NextResponse.json({
        message: "NF-e atualizada com sucesso!"
      })

    } catch (error) {
      await query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error updating NFe:', error)
    return NextResponse.json({
      error: "Erro ao atualizar NF-e: " + (error as Error).message
    }, { status: 500 })
  }
}
