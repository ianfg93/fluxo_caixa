import jsPDF from 'jspdf'

export interface BudgetPDFData {
  budget: {
    budgetNumber: string
    issueDate: Date
    validityDate?: Date
    customerName?: string
    customerEmail?: string
    customerPhone?: string
    customerAddress?: string
    subtotal: number
    discount: number
    total: number
    notes?: string
    items: Array<{
      description: string
      quantity: number
      unitPrice: number
      totalPrice: number
    }>
  }
  template: {
    name: string
    logoUrl?: string
    logoPosition?: string
    headerText?: string
    footerText?: string
    styles: {
      primaryColor: string
      fontSize: string
      fontFamily: string
    }
  }
  company: {
    name: string
    cnpj?: string
  }
}

export class PDFGenerator {
  static async generateBudgetPDF(data: BudgetPDFData): Promise<Blob> {
    const doc = new jsPDF()

    const primaryColor = this.hexToRgb(data.template.styles.primaryColor || '#000000')
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const margin = 20
    let yPos = margin

    // Logo (se existir)
    if (data.template.logoUrl) {
      try {
        const logoWidth = 40
        const logoHeight = 20
        let logoX = margin
        let logoY = margin

        // Posicionar logo conforme configuração
        switch (data.template.logoPosition) {
          case 'top-left':
            logoX = margin
            logoY = margin
            break
          case 'top-center':
            logoX = (pageWidth - logoWidth) / 2
            logoY = margin
            break
          case 'top-right':
            logoX = pageWidth - margin - logoWidth
            logoY = margin
            break
          case 'bottom-left':
            logoX = margin
            logoY = pageHeight - margin - logoHeight
            break
          case 'bottom-center':
            logoX = (pageWidth - logoWidth) / 2
            logoY = pageHeight - margin - logoHeight
            break
          case 'bottom-right':
            logoX = pageWidth - margin - logoWidth
            logoY = pageHeight - margin - logoHeight
            break
        }

        // Adicionar logo apenas se estiver no topo
        if (data.template.logoPosition?.startsWith('top')) {
          doc.addImage(data.template.logoUrl, 'PNG', logoX, logoY, logoWidth, logoHeight)
          yPos = margin + logoHeight + 10
        }
      } catch (error) {
        console.error('Erro ao adicionar logo ao PDF:', error)
      }
    }

    // Header
    doc.setFontSize(20)
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b)
    doc.text('ORÇAMENTO', pageWidth / 2, yPos, { align: 'center' })
    yPos += 10

    // Número do orçamento
    doc.setFontSize(12)
    doc.setTextColor(100, 100, 100)
    doc.text(`Nº ${data.budget.budgetNumber}`, pageWidth / 2, yPos, { align: 'center' })
    yPos += 15

    // Header text personalizado
    if (data.template.headerText) {
      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const headerLines = doc.splitTextToSize(data.template.headerText, pageWidth - 2 * margin)
      doc.text(headerLines, margin, yPos)
      yPos += headerLines.length * 5 + 5
    }

    // Linha separadora
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageWidth - margin, yPos)
    yPos += 10

    // Informações da empresa
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS DA EMPRESA', margin, yPos)
    yPos += 7

    doc.setFont('helvetica', 'normal')
    doc.text(data.company.name, margin, yPos)
    yPos += 5
    if (data.company.cnpj) {
      doc.text(`CNPJ: ${data.company.cnpj}`, margin, yPos)
      yPos += 5
    }
    yPos += 5

    // Informações do cliente
    if (data.budget.customerName) {
      doc.setFont('helvetica', 'bold')
      doc.text('DADOS DO CLIENTE', margin, yPos)
      yPos += 7

      doc.setFont('helvetica', 'normal')
      doc.text(data.budget.customerName, margin, yPos)
      yPos += 5
      if (data.budget.customerEmail) {
        doc.text(`Email: ${data.budget.customerEmail}`, margin, yPos)
        yPos += 5
      }
      if (data.budget.customerPhone) {
        doc.text(`Telefone: ${data.budget.customerPhone}`, margin, yPos)
        yPos += 5
      }
      if (data.budget.customerAddress) {
        const addressLines = doc.splitTextToSize(data.budget.customerAddress, pageWidth - 2 * margin)
        doc.text(addressLines, margin, yPos)
        yPos += addressLines.length * 5
      }
      yPos += 5
    }

    // Datas
    doc.setFont('helvetica', 'bold')
    doc.text('INFORMAÇÕES', margin, yPos)
    yPos += 7

    doc.setFont('helvetica', 'normal')
    doc.text(`Data de Emissão: ${this.formatDate(data.budget.issueDate)}`, margin, yPos)
    yPos += 5
    if (data.budget.validityDate) {
      doc.text(`Validade: ${this.formatDate(data.budget.validityDate)}`, margin, yPos)
      yPos += 5
    }
    yPos += 10

    // Tabela de itens
    doc.setFont('helvetica', 'bold')
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b)
    doc.setTextColor(255, 255, 255)
    doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F')

    const colWidths = {
      description: (pageWidth - 2 * margin) * 0.45,
      quantity: (pageWidth - 2 * margin) * 0.15,
      unitPrice: (pageWidth - 2 * margin) * 0.20,
      total: (pageWidth - 2 * margin) * 0.20,
    }

    doc.setFontSize(9)
    let xPos = margin + 2
    doc.text('DESCRIÇÃO', xPos, yPos + 5)
    xPos += colWidths.description
    doc.text('QTD', xPos, yPos + 5)
    xPos += colWidths.quantity
    doc.text('VALOR UNIT.', xPos, yPos + 5)
    xPos += colWidths.unitPrice
    doc.text('TOTAL', xPos, yPos + 5)
    yPos += 10

    // Itens
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0, 0, 0)

    for (const item of data.budget.items) {
      // Verificar se precisa de nova página
      if (yPos > pageHeight - 40) {
        doc.addPage()
        yPos = margin
      }

      xPos = margin + 2
      const descLines = doc.splitTextToSize(item.description, colWidths.description - 4)
      doc.text(descLines, xPos, yPos + 4)

      xPos += colWidths.description
      doc.text(item.quantity.toString(), xPos, yPos + 4)

      xPos += colWidths.quantity
      doc.text(this.formatCurrency(item.unitPrice), xPos, yPos + 4)

      xPos += colWidths.unitPrice
      doc.text(this.formatCurrency(item.totalPrice), xPos, yPos + 4)

      const lineHeight = Math.max(descLines.length * 5, 7)
      yPos += lineHeight

      // Linha separadora
      doc.setDrawColor(230, 230, 230)
      doc.line(margin, yPos, pageWidth - margin, yPos)
      yPos += 2
    }

    yPos += 5

    // Totais
    const totalsX = pageWidth - margin - 80

    if (data.budget.discount > 0) {
      doc.setFont('helvetica', 'normal')
      doc.text('Subtotal:', totalsX, yPos)
      doc.text(this.formatCurrency(data.budget.subtotal), totalsX + 40, yPos, { align: 'right' })
      yPos += 7

      doc.text('Desconto:', totalsX, yPos)
      doc.text(`- ${this.formatCurrency(data.budget.discount)}`, totalsX + 40, yPos, { align: 'right' })
      yPos += 7
    }

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('TOTAL:', totalsX, yPos)
    doc.text(this.formatCurrency(data.budget.total), totalsX + 40, yPos, { align: 'right' })
    yPos += 10

    // Observações
    if (data.budget.notes) {
      yPos += 5
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('OBSERVAÇÕES:', margin, yPos)
      yPos += 7

      doc.setFont('helvetica', 'normal')
      const notesLines = doc.splitTextToSize(data.budget.notes, pageWidth - 2 * margin)
      doc.text(notesLines, margin, yPos)
      yPos += notesLines.length * 5
    }

    // Logo no rodapé (se configurado)
    if (data.template.logoUrl && data.template.logoPosition?.startsWith('bottom')) {
      try {
        const logoWidth = 40
        const logoHeight = 20
        let logoX = margin
        const logoY = pageHeight - margin - logoHeight

        switch (data.template.logoPosition) {
          case 'bottom-left':
            logoX = margin
            break
          case 'bottom-center':
            logoX = (pageWidth - logoWidth) / 2
            break
          case 'bottom-right':
            logoX = pageWidth - margin - logoWidth
            break
        }

        doc.addImage(data.template.logoUrl, 'PNG', logoX, logoY, logoWidth, logoHeight)
      } catch (error) {
        console.error('Erro ao adicionar logo no rodapé:', error)
      }
    }

    // Footer text personalizado
    if (data.template.footerText) {
      const footerY = data.template.logoPosition?.startsWith('bottom')
        ? pageHeight - 35
        : pageHeight - 20
      doc.setFontSize(8)
      doc.setTextColor(100, 100, 100)
      const footerLines = doc.splitTextToSize(data.template.footerText, pageWidth - 2 * margin)
      doc.text(footerLines, pageWidth / 2, footerY, { align: 'center' })
    }

    // Converter para Blob
    const pdfBlob = doc.output('blob')
    return pdfBlob
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 }
  }

  private static formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  private static formatCurrency(value: number): string {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }
}
