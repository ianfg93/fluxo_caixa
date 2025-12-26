import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"
import { PDFGenerator, type BudgetPDFData } from "@/lib/pdf-generator"

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

    // Buscar orçamento completo
    const budgetResult = await query(
      `SELECT
        b.id, b.budget_number as "budgetNumber",
        b.customer_name as "customerName", b.customer_email as "customerEmail",
        b.customer_phone as "customerPhone", b.customer_address as "customerAddress",
        b.issue_date as "issueDate", b.validity_date as "validityDate",
        b.subtotal, b.discount, b.total, b.notes,
        t.name as "templateName", t.logo_url as "logoUrl",
        t.logo_position as "logoPosition", t.header_text as "headerText",
        t.footer_text as "footerText", t.styles,
        c.name as "companyName", c.cnpj as "companyCnpj"
      FROM budgets b
      LEFT JOIN budget_templates t ON b.template_id = t.id
      LEFT JOIN companies c ON b.company_id = c.id
      WHERE b.id = $1::uuid AND b.company_id = $2::uuid`,
      [params.id, user.companyId]
    )

    if (budgetResult.rows.length === 0) {
      return NextResponse.json({ error: "Orçamento não encontrado" }, { status: 404 })
    }

    const budgetData = budgetResult.rows[0]

    // Buscar itens
    const itemsResult = await query(
      `SELECT
        description, quantity, unit_price as "unitPrice", total_price as "totalPrice"
      FROM budget_items
      WHERE budget_id = $1::uuid
      ORDER BY display_order ASC`,
      [params.id]
    )

    // Montar dados para o PDF
    const pdfData: BudgetPDFData = {
      budget: {
        budgetNumber: budgetData.budgetNumber,
        issueDate: new Date(budgetData.issueDate),
        validityDate: budgetData.validityDate ? new Date(budgetData.validityDate) : undefined,
        customerName: budgetData.customerName,
        customerEmail: budgetData.customerEmail,
        customerPhone: budgetData.customerPhone,
        customerAddress: budgetData.customerAddress,
        subtotal: parseFloat(budgetData.subtotal),
        discount: parseFloat(budgetData.discount),
        total: parseFloat(budgetData.total),
        notes: budgetData.notes,
        items: itemsResult.rows.map(item => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseFloat(item.totalPrice),
        })),
      },
      template: {
        name: budgetData.templateName,
        logoUrl: budgetData.logoUrl,
        logoPosition: budgetData.logoPosition,
        headerText: budgetData.headerText,
        footerText: budgetData.footerText,
        styles: budgetData.styles || {
          primaryColor: '#000000',
          fontSize: '12px',
          fontFamily: 'Arial',
        },
      },
      company: {
        name: budgetData.companyName,
        cnpj: budgetData.companyCnpj,
      },
    }

    // Gerar PDF
    const pdfBlob = await PDFGenerator.generateBudgetPDF(pdfData)

    // Converter Blob para Buffer
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Retornar PDF
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="orcamento-${budgetData.budgetNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: "Erro ao gerar PDF" }, { status: 500 })
  }
}
