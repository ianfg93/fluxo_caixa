import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  console.log('=== GET /api/nfe INICIOU ===')

  try {
    console.log('1. Autenticando...')
    const user = await ApiAuthService.authenticateRequest(request)

    if (!user) {
      console.log('Usuário não autenticado')
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    console.log('2. Usuário:', user.name, 'Role:', user.role)

    console.log('3. Montando query...')
    const { searchParams } = new URL(request.url)
    const companyFilter = searchParams.get("company")
    const status = searchParams.get("status")

    let baseQuery = `
      SELECT
        n.id,
        n.nfe_number as "nfeNumber",
        n.nfe_series as "nfeSeries",
        n.nfe_access_key as "nfeAccessKey",
        n.issue_date as "issueDate",
        n.receipt_date as "receiptDate",
        n.total_products as "totalProducts",
        n.total_invoice as "totalInvoice",
        n.payment_status as "paymentStatus",
        n.payment_method as "paymentMethod",
        n.payment_terms as "paymentTerms",
        n.installments,
        n.first_due_date as "firstDueDate",
        n.operation_type as "operationType",
        n.notes,
        n.stock_updated as "stockUpdated",
        n.accounts_payable_created as "accountsPayableCreated",
        n.status,
        n.company_id as "companyId",
        n.vendor_id as "vendorId",
        n.created_at as "createdAt",
        n.updated_at as "updatedAt",
        v.name as "vendorName",
        v.cnpj as "vendorCnpj",
        u.name as "createdByName"
      FROM nfe_invoices n
      INNER JOIN vendors v ON n.vendor_id = v.id
      INNER JOIN users u ON n.created_by = u.id
    `

    let queryParams: any[] = []
    let whereConditions: string[] = []

    const targetCompanyId = companyFilter || user.companyId
    if (targetCompanyId) {
      whereConditions.push(`n.company_id = $${queryParams.length + 1}::uuid`)
      queryParams.push(targetCompanyId)
    }

    if (status) {
      whereConditions.push(`n.status = $${queryParams.length + 1}`)
      queryParams.push(status)
    }

    let finalQuery = baseQuery
    if (whereConditions.length > 0) {
      finalQuery += ` WHERE ${whereConditions.join(' AND ')}`
    }
    finalQuery += ` ORDER BY n.issue_date DESC, n.nfe_number DESC`

    console.log('4. Query:', finalQuery)
    console.log('5. Params:', queryParams)

    console.log('6. Executando query...')
    const result = await query(finalQuery, queryParams)

    console.log('7. Sucesso! NF-e encontradas:', result.rows.length)

    return NextResponse.json({ invoices: result.rows })
  } catch (error) {
    console.error('ERRO NO GET:', error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== POST /api/nfe ===')
    const user = await ApiAuthService.authenticateRequest(request)
    console.log('User:', user?.name, 'Company:', user?.companyId)

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    // Apenas master e administrator podem criar NF-e
    if (user.role !== 'master' && user.role !== 'administrator') {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 })
    }

    const data = await request.json()
    console.log('NF-e data:', data)

    // Validações básicas
    if (!data.nfeNumber || !data.nfeSeries) {
      return NextResponse.json({ error: "Número e série da NF-e são obrigatórios" }, { status: 400 })
    }

    if (!data.vendorId) {
      return NextResponse.json({ error: "Fornecedor é obrigatório" }, { status: 400 })
    }

    if (!data.issueDate) {
      return NextResponse.json({ error: "Data de emissão é obrigatória" }, { status: 400 })
    }

    if (!data.items || data.items.length === 0) {
      return NextResponse.json({ error: "A NF-e deve conter pelo menos um item" }, { status: 400 })
    }

    if (!data.totalInvoice || parseFloat(data.totalInvoice) <= 0) {
      return NextResponse.json({ error: "Valor total da nota inválido" }, { status: 400 })
    }

    // Validar se todos os produtos existem
    for (const item of data.items) {
      if (!item.productId) {
        return NextResponse.json({ error: "Todos os itens devem ter um produto vinculado" }, { status: 400 })
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        return NextResponse.json({ error: "Quantidade inválida para o produto: " + item.productDescription }, { status: 400 })
      }
    }

    console.log('Iniciando transação...')
    await query('BEGIN')

    try {
      // Inserir NF-e
      console.log('Inserindo NF-e...')
      const invoiceResult = await query(
        `INSERT INTO nfe_invoices (
          company_id, vendor_id, nfe_number, nfe_series, nfe_access_key, nfe_protocol,
          issue_date, receipt_date, total_products, total_tax, freight_value,
          insurance_value, discount_value, other_expenses, total_invoice,
          payment_status, payment_method, payment_category, payment_terms, installments, first_due_date,
          icms_value, ipi_value, pis_value, cofins_value,
          operation_type, cfop, notes, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
        ) RETURNING id`,
        [
          user.companyId,
          data.vendorId,
          data.nfeNumber,
          data.nfeSeries,
          data.nfeAccessKey || null,
          data.nfeProtocol || null,
          data.issueDate,
          data.receiptDate || new Date().toISOString().split('T')[0],
          data.totalProducts || 0,
          data.totalTax || 0,
          data.freightValue || 0,
          data.insuranceValue || 0,
          data.discountValue || 0,
          data.otherExpenses || 0,
          data.totalInvoice,
          data.paymentStatus || 'pending',
          data.paymentMethod || null,
          data.paymentCategory || 'Compras',
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
          user.id
        ]
      )

      const invoiceId = invoiceResult.rows[0].id
      console.log('NF-e criada com ID:', invoiceId)

      // Inserir itens da NF-e
      console.log('Inserindo itens...')
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
            invoiceId,
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

      console.log('Itens inseridos com sucesso')

      // Atualizar estoque
      console.log('Atualizando estoque...')
      for (const item of data.items) {
        const quantityToAdd = Math.floor(parseFloat(item.quantity))

        // Atualizar quantidade do produto
        await query(
          `UPDATE products SET quantity = quantity + $1 WHERE id = $2`,
          [quantityToAdd, item.productId]
        )

        // Registrar movimento de estoque
        await query(
          `INSERT INTO stock_movements (product_id, quantity, type, notes, created_by, nfe_invoice_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            item.productId,
            quantityToAdd,
            'adjustment',
            `Entrada via NF-e: ${data.nfeNumber}/${data.nfeSeries}`,
            user.id,
            invoiceId
          ]
        )
      }

      // Marcar estoque como atualizado
      await query(
        `UPDATE nfe_invoices
         SET stock_updated = TRUE, stock_updated_at = NOW(), stock_updated_by = $1
         WHERE id = $2`,
        [user.id, invoiceId]
      )
      console.log('Estoque atualizado!')

      // Criar contas a pagar se necessário
      if (data.paymentStatus === 'pending' && data.firstDueDate && data.installments > 0) {
        console.log('Criando contas a pagar...')
        const installmentValue = parseFloat(data.totalInvoice) / parseInt(data.installments)

        for (let i = 1; i <= parseInt(data.installments); i++) {
          const dueDate = new Date(data.firstDueDate)
          dueDate.setDate(dueDate.getDate() + (i - 1) * 30)

          const description = `NF-e ${data.nfeNumber}/${data.nfeSeries}` +
            (data.installments > 1 ? ` - Parcela ${i}/${data.installments}` : '')

          await query(
            `INSERT INTO accounts_payable (
              company_id, vendor_id, description, amount, issue_date, due_date,
              status, category, invoice_number, notes, created_by, nfe_invoice_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
            [
              user.companyId,
              data.vendorId,
              description,
              installmentValue,
              data.issueDate,
              dueDate.toISOString().split('T')[0],
              'pending',
              'Compra de Mercadorias',
              `${data.nfeNumber}/${data.nfeSeries}`,
              `Gerado automaticamente via NF-e. ${data.notes || ''}`,
              user.id,
              invoiceId
            ]
          )
        }

        // Marcar contas a pagar como criadas
        await query(
          `UPDATE nfe_invoices SET accounts_payable_created = TRUE WHERE id = $1`,
          [invoiceId]
        )
        console.log('Contas a pagar criadas!')
      }

      // Se foi pago à vista, registrar no fluxo de caixa
      if (data.paymentStatus === 'paid') {
        console.log('Registrando pagamento à vista no fluxo de caixa...')
        await query(
          `INSERT INTO cash_flow_transactions (
            company_id, type, category, subcategory, amount, description,
            transaction_date, payment_method, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            user.companyId,
            'exit',
            data.paymentCategory || 'Compras',
            'Mercadorias',
            data.totalInvoice,
            `NF-e ${data.nfeNumber}/${data.nfeSeries}`,
            data.receiptDate || new Date().toISOString().split('T')[0],
            data.paymentMethod || 'Não especificado',
            user.id
          ]
        )
        console.log('Pagamento registrado!')
      }

      // Buscar a NF-e completa para retornar
      const completeInvoice = await query(
        `SELECT
          n.id,
          n.nfe_number as "nfeNumber",
          n.nfe_series as "nfeSeries",
          n.nfe_access_key as "nfeAccessKey",
          n.issue_date as "issueDate",
          n.receipt_date as "receiptDate",
          n.total_invoice as "totalInvoice",
          n.payment_status as "paymentStatus",
          n.stock_updated as "stockUpdated",
          n.accounts_payable_created as "accountsPayableCreated",
          n.status,
          v.name as "vendorName"
        FROM nfe_invoices n
        INNER JOIN vendors v ON n.vendor_id = v.id
        WHERE n.id = $1`,
        [invoiceId]
      )

      await query('COMMIT')
      console.log('Transação finalizada com sucesso')

      return NextResponse.json({
        invoice: completeInvoice.rows[0],
        message: "NF-e cadastrada com sucesso!"
      }, { status: 201 })

    } catch (error) {
      await query('ROLLBACK')
      console.error('Erro na transação:', error)
      throw error
    }

  } catch (error) {
    console.error('ERRO COMPLETO:', error)
    return NextResponse.json({
      error: "Erro ao cadastrar NF-e: " + (error as Error).message
    }, { status: 500 })
  }
}
