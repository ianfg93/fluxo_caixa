import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function POST(
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

    console.log('=== POST /api/nfe/[id]/process ===')
    console.log('ID:', id)

    // Buscar a NF-e
    const invoiceResult = await query(
      `SELECT * FROM nfe_invoices WHERE id = $1 AND company_id = $2`,
      [id, user.companyId]
    )

    if (invoiceResult.rows.length === 0) {
      return NextResponse.json({ error: "NF-e não encontrada" }, { status: 404 })
    }

    const invoice = invoiceResult.rows[0]

    if (invoice.stock_updated) {
      return NextResponse.json({ error: "Estoque já foi processado" }, { status: 400 })
    }

    await query('BEGIN')

    try {
      // Buscar itens da NF-e
      const itemsResult = await query(
        `SELECT * FROM nfe_items WHERE nfe_invoice_id = $1`,
        [id]
      )

      // Atualizar estoque
      console.log('Processando estoque...')
      for (const item of itemsResult.rows) {
        const quantityToAdd = Math.floor(parseFloat(item.quantity))

        // Atualizar quantidade do produto
        await query(
          `UPDATE products SET quantity = quantity + $1 WHERE id = $2`,
          [quantityToAdd, item.product_id]
        )

        // Registrar movimento de estoque
        await query(
          `INSERT INTO stock_movements (product_id, quantity, type, notes, created_by, nfe_invoice_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            item.product_id,
            quantityToAdd,
            'adjustment',
            `Entrada via NF-e: ${invoice.nfe_number}/${invoice.nfe_series}`,
            user.id,
            id
          ]
        )
      }

      // Marcar estoque como atualizado
      await query(
        `UPDATE nfe_invoices
         SET stock_updated = TRUE, stock_updated_at = NOW(), stock_updated_by = $1
         WHERE id = $2`,
        [user.id, id]
      )
      console.log('Estoque atualizado!')

      // Criar contas a pagar se necessário
      if (invoice.payment_status === 'pending' && invoice.first_due_date && invoice.installments > 0 && !invoice.accounts_payable_created) {
        console.log('Criando contas a pagar...')
        const installmentValue = parseFloat(invoice.total_invoice) / parseInt(invoice.installments)

        for (let i = 1; i <= parseInt(invoice.installments); i++) {
          const dueDate = new Date(invoice.first_due_date)
          dueDate.setDate(dueDate.getDate() + (i - 1) * 30)

          const description = `NF-e ${invoice.nfe_number}/${invoice.nfe_series}` +
            (invoice.installments > 1 ? ` - Parcela ${i}/${invoice.installments}` : '')

          await query(
            `INSERT INTO accounts_payable (
              company_id, vendor_id, description, amount, issue_date, due_date,
              status, category, invoice_number, notes, created_by, nfe_invoice_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              user.companyId,
              invoice.vendor_id,
              description,
              installmentValue,
              invoice.issue_date,
              dueDate.toISOString().split('T')[0],
              'pending',
              'Compra de Mercadorias',
              `${invoice.nfe_number}/${invoice.nfe_series}`,
              `Gerado automaticamente via NF-e. ${invoice.notes || ''}`,
              user.id,
              id
            ]
          )
        }

        // Marcar contas a pagar como criadas
        await query(
          `UPDATE nfe_invoices SET accounts_payable_created = TRUE WHERE id = $1`,
          [id]
        )
        console.log('Contas a pagar criadas!')
      }

      // Se foi pago à vista, registrar no fluxo de caixa
      if (invoice.payment_status === 'paid') {
        console.log('Registrando pagamento à vista no fluxo de caixa...')
        await query(
          `INSERT INTO cash_flow_transactions (
            company_id, type, category, subcategory, amount, description,
            transaction_date, payment_method, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            user.companyId,
            'exit',
            invoice.payment_category || 'Compras',
            'Mercadorias',
            invoice.total_invoice,
            `NF-e ${invoice.nfe_number}/${invoice.nfe_series}`,
            invoice.receipt_date,
            invoice.payment_method || 'Não especificado',
            user.id
          ]
        )
        console.log('Pagamento registrado!')
      }

      await query('COMMIT')

      return NextResponse.json({
        message: "NF-e processada com sucesso!"
      })

    } catch (error) {
      await query('ROLLBACK')
      throw error
    }

  } catch (error) {
    console.error('Error processing NFe:', error)
    return NextResponse.json({
      error: "Erro ao processar NF-e: " + (error as Error).message
    }, { status: 500 })
  }
}
