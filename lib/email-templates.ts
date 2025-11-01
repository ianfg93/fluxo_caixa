export interface AccountPayableEmailData {
  overdue: Array<{
    id: string
    supplierName: string
    description: string
    amount: number
    dueDate: Date
    daysOverdue: number
  }>
  dueToday: Array<{
    id: string
    supplierName: string
    description: string
    amount: number
    dueDate: Date
  }>
  dueIn7Days: Array<{
    id: string
    supplierName: string
    description: string
    amount: number
    dueDate: Date
    daysUntilDue: number
  }>
  dueIn30Days: Array<{
    id: string
    supplierName: string
    description: string
    amount: number
    dueDate: Date
    daysUntilDue: number
  }>
  totalOverdue: number
  totalDueToday: number
  totalDueIn7Days: number
  totalDueIn30Days: number
}

export class EmailTemplates {
  /**
   * Formata moeda para BRL
   */
  private static formatCurrency(amount: number): string {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  /**
   * Formata data para DD/MM/YYYY
   */
  private static formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('pt-BR')
  }

  /**
   * Template de email de contas a pagar
   */
  static accountsPayableNotification(data: AccountPayableEmailData): string {
    const today = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Contas a Pagar</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #2563eb;
      margin: 0;
      font-size: 28px;
    }
    .date {
      color: #6b7280;
      font-size: 14px;
      margin-top: 8px;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .section-title.overdue {
      color: #dc2626;
    }
    .section-title.today {
      color: #ea580c;
    }
    .section-title.upcoming {
      color: #d97706;
    }
    .section-title.month {
      color: #2563eb;
    }
    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 15px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .summary-card.overdue {
      background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
    }
    .summary-card.today {
      background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
    }
    .summary-card.upcoming {
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
    }
    .summary-card h3 {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      opacity: 0.9;
    }
    .summary-card .amount {
      font-size: 24px;
      font-weight: bold;
      margin: 8px 0 4px 0;
    }
    .summary-card .count {
      font-size: 12px;
      opacity: 0.8;
    }
    .account-item {
      background-color: #f9fafb;
      border-left: 4px solid #2563eb;
      padding: 15px;
      margin-bottom: 12px;
      border-radius: 4px;
    }
    .account-item.overdue {
      border-left-color: #dc2626;
      background-color: #fef2f2;
    }
    .account-item.today {
      border-left-color: #ea580c;
      background-color: #fff7ed;
    }
    .account-item.upcoming {
      border-left-color: #d97706;
      background-color: #fffbeb;
    }
    .account-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .supplier-name {
      font-weight: bold;
      font-size: 16px;
      color: #1f2937;
    }
    .amount {
      font-weight: bold;
      font-size: 18px;
      color: #2563eb;
    }
    .amount.overdue {
      color: #dc2626;
    }
    .amount.today {
      color: #ea580c;
    }
    .amount.upcoming {
      color: #d97706;
    }
    .description {
      color: #6b7280;
      font-size: 14px;
      margin: 4px 0;
    }
    .due-date {
      font-size: 13px;
      color: #4b5563;
      margin-top: 8px;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-left: 8px;
    }
    .badge.overdue {
      background-color: #fee2e2;
      color: #991b1b;
    }
    .badge.today {
      background-color: #ffedd5;
      color: #9a3412;
    }
    .badge.upcoming {
      background-color: #fef3c7;
      color: #92400e;
    }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: #6b7280;
    }
    .empty-state svg {
      width: 64px;
      height: 64px;
      margin: 0 auto 16px;
      opacity: 0.5;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      color: #6b7280;
      font-size: 13px;
    }
    @media only screen and (max-width: 600px) {
      body {
        padding: 10px;
      }
      .container {
        padding: 20px;
      }
      .summary-cards {
        grid-template-columns: 1fr;
      }
      .account-header {
        flex-direction: column;
        gap: 8px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório de Contas a Pagar</h1>
      <div class="date">${today}</div>
    </div>

    <!-- Summary Cards -->
    <div class="summary-cards">
      <div class="summary-card overdue">
        <h3>Vencidas</h3>
        <div class="amount">${this.formatCurrency(data.totalOverdue)}</div>
        <div class="count">${data.overdue.length} conta(s)</div>
      </div>
      <div class="summary-card today">
        <h3>Vence Hoje</h3>
        <div class="amount">${this.formatCurrency(data.totalDueToday)}</div>
        <div class="count">${data.dueToday.length} conta(s)</div>
      </div>
      <div class="summary-card upcoming">
        <h3>Próximos 7 Dias</h3>
        <div class="amount">${this.formatCurrency(data.totalDueIn7Days)}</div>
        <div class="count">${data.dueIn7Days.length} conta(s)</div>
      </div>
      <div class="summary-card">
        <h3>Próximos 30 Dias</h3>
        <div class="amount">${this.formatCurrency(data.totalDueIn30Days)}</div>
        <div class="count">${data.dueIn30Days.length} conta(s)</div>
      </div>
    </div>

    <!-- Contas Vencidas -->
    ${
      data.overdue.length > 0
        ? `
    <div class="section">
      <h2 class="section-title overdue">⚠️ Contas Vencidas (${data.overdue.length})</h2>
      ${data.overdue
        .map(
          (account) => `
        <div class="account-item overdue">
          <div class="account-header">
            <div>
              <div class="supplier-name">${account.supplierName}</div>
              <div class="description">${account.description}</div>
            </div>
            <div class="amount overdue">${this.formatCurrency(account.amount)}</div>
          </div>
          <div class="due-date">
            Vencimento: ${this.formatDate(account.dueDate)}
            <span class="badge overdue">${account.daysOverdue} dia(s) em atraso</span>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    <!-- Contas que Vencem Hoje -->
    ${
      data.dueToday.length > 0
        ? `
    <div class="section">
      <h2 class="section-title today">🔔 Vence Hoje (${data.dueToday.length})</h2>
      ${data.dueToday
        .map(
          (account) => `
        <div class="account-item today">
          <div class="account-header">
            <div>
              <div class="supplier-name">${account.supplierName}</div>
              <div class="description">${account.description}</div>
            </div>
            <div class="amount today">${this.formatCurrency(account.amount)}</div>
          </div>
          <div class="due-date">
            Vencimento: ${this.formatDate(account.dueDate)}
            <span class="badge today">Vence hoje</span>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    <!-- Próximos 7 Dias -->
    ${
      data.dueIn7Days.length > 0
        ? `
    <div class="section">
      <h2 class="section-title upcoming">📅 Próximos 7 Dias (${data.dueIn7Days.length})</h2>
      ${data.dueIn7Days
        .map(
          (account) => `
        <div class="account-item upcoming">
          <div class="account-header">
            <div>
              <div class="supplier-name">${account.supplierName}</div>
              <div class="description">${account.description}</div>
            </div>
            <div class="amount upcoming">${this.formatCurrency(account.amount)}</div>
          </div>
          <div class="due-date">
            Vencimento: ${this.formatDate(account.dueDate)}
            <span class="badge upcoming">Em ${account.daysUntilDue} dia(s)</span>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    <!-- Próximos 30 Dias -->
    ${
      data.dueIn30Days.length > 0
        ? `
    <div class="section">
      <h2 class="section-title month">📆 Próximos 30 Dias (${data.dueIn30Days.length})</h2>
      ${data.dueIn30Days
        .map(
          (account) => `
        <div class="account-item">
          <div class="account-header">
            <div>
              <div class="supplier-name">${account.supplierName}</div>
              <div class="description">${account.description}</div>
            </div>
            <div class="amount">${this.formatCurrency(account.amount)}</div>
          </div>
          <div class="due-date">
            Vencimento: ${this.formatDate(account.dueDate)}
            <span class="badge upcoming">Em ${account.daysUntilDue} dia(s)</span>
          </div>
        </div>
      `
        )
        .join('')}
    </div>
    `
        : ''
    }

    <!-- Empty State -->
    ${
      data.overdue.length === 0 &&
      data.dueToday.length === 0 &&
      data.dueIn7Days.length === 0 &&
      data.dueIn30Days.length === 0
        ? `
    <div class="empty-state">
      <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
      <h3 style="margin: 0 0 8px 0;">Tudo em dia!</h3>
      <p style="margin: 0;">Não há contas a pagar pendentes no momento.</p>
    </div>
    `
        : ''
    }

    <div class="footer">
      <p>Este é um email automático do Sistema de Fluxo de Caixa.</p>
      <p>Enviado automaticamente todos os dias às 9h.</p>
    </div>
  </div>
</body>
</html>
    `
  }
}
