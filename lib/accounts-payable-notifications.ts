import { AccountsPayableService } from './accounts-payable'
import { emailService } from './email-service'
import { EmailTemplates, type AccountPayableEmailData } from './email-templates'

export class AccountsPayableNotifications {
  /**
   * Calcula a diferença em dias entre duas datas
   */
  private static getDaysDifference(date1: Date, date2: Date): number {
    const diffTime = date2.getTime() - date1.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Obtém a data de hoje sem horas
   */
  private static getToday(): Date {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  /**
   * Coleta dados de contas a pagar para o relatório
   */
  static async collectAccountsPayableData(
    companyId?: string
  ): Promise<AccountPayableEmailData> {
    const today = this.getToday()
    const in7Days = new Date(today)
    in7Days.setDate(today.getDate() + 7)
    const in30Days = new Date(today)
    in30Days.setDate(today.getDate() + 30)

    // Buscar todas as contas pendentes
    const allAccounts = await AccountsPayableService.getAccountsPayable(companyId)
    const pendingAccounts = allAccounts.filter((account) => account.status === 'pending')

    // Contas vencidas
    const overdue = pendingAccounts
      .filter((account) => {
        const dueDate = new Date(account.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate < today
      })
      .map((account) => {
        const dueDate = new Date(account.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        const daysOverdue = Math.abs(this.getDaysDifference(dueDate, today))
        return {
          id: account.id,
          supplierName: account.supplierName,
          description: account.description,
          amount: account.amount,
          dueDate: account.dueDate,
          daysOverdue,
        }
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue) // Ordenar por dias de atraso (mais antigo primeiro)

    // Contas que vencem hoje
    const dueToday = pendingAccounts
      .filter((account) => {
        const dueDate = new Date(account.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate.getTime() === today.getTime()
      })
      .map((account) => ({
        id: account.id,
        supplierName: account.supplierName,
        description: account.description,
        amount: account.amount,
        dueDate: account.dueDate,
      }))

    // Contas que vencem nos próximos 7 dias (excluindo hoje)
    const dueIn7Days = pendingAccounts
      .filter((account) => {
        const dueDate = new Date(account.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate > today && dueDate <= in7Days
      })
      .map((account) => {
        const dueDate = new Date(account.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        const daysUntilDue = this.getDaysDifference(today, dueDate)
        return {
          id: account.id,
          supplierName: account.supplierName,
          description: account.description,
          amount: account.amount,
          dueDate: account.dueDate,
          daysUntilDue,
        }
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue) // Ordenar por dias até vencer

    // Contas que vencem nos próximos 30 dias (excluindo os próximos 7 dias)
    const dueIn30Days = pendingAccounts
      .filter((account) => {
        const dueDate = new Date(account.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate > in7Days && dueDate <= in30Days
      })
      .map((account) => {
        const dueDate = new Date(account.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        const daysUntilDue = this.getDaysDifference(today, dueDate)
        return {
          id: account.id,
          supplierName: account.supplierName,
          description: account.description,
          amount: account.amount,
          dueDate: account.dueDate,
          daysUntilDue,
        }
      })
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue) // Ordenar por dias até vencer

    // Calcular totais
    const totalOverdue = overdue.reduce((sum, account) => sum + account.amount, 0)
    const totalDueToday = dueToday.reduce((sum, account) => sum + account.amount, 0)
    const totalDueIn7Days = dueIn7Days.reduce((sum, account) => sum + account.amount, 0)
    const totalDueIn30Days = dueIn30Days.reduce((sum, account) => sum + account.amount, 0)

    return {
      overdue,
      dueToday,
      dueIn7Days,
      dueIn30Days,
      totalOverdue,
      totalDueToday,
      totalDueIn7Days,
      totalDueIn30Days,
    }
  }

  /**
   * Envia notificação diária de contas a pagar
   */
  static async sendDailyNotification(
    recipients: string | string[],
    companyId?: string
  ): Promise<boolean> {
    try {
      // Verificar se o serviço de email está configurado
      if (!emailService.isConfigured()) {
        console.error('Email service is not configured. Please check your environment variables.')
        return false
      }

      // Coletar dados
      console.log('Collecting accounts payable data...')
      const data = await this.collectAccountsPayableData(companyId)

      // Gerar HTML do email
      console.log('Generating email template...')
      const html = EmailTemplates.accountsPayableNotification(data)

      // Criar subject dinâmico baseado na situação
      let subject = '📊 Relatório Diário de Contas a Pagar'
      if (data.overdue.length > 0) {
        subject = `⚠️ ${data.overdue.length} Conta(s) Vencida(s) - Relatório de Contas a Pagar`
      } else if (data.dueToday.length > 0) {
        subject = `🔔 ${data.dueToday.length} Conta(s) Vence(m) Hoje - Relatório de Contas a Pagar`
      } else if (data.dueIn7Days.length > 0) {
        subject = `📅 ${data.dueIn7Days.length} Conta(s) nos Próximos 7 Dias - Relatório de Contas a Pagar`
      }

      // Enviar email
      console.log('Sending email notification...')
      const success = await emailService.sendEmail({
        to: recipients,
        subject,
        html,
      })

      if (success) {
        console.log('Daily notification sent successfully!')
        console.log(`Summary:`)
        console.log(`  - Overdue: ${data.overdue.length} accounts`)
        console.log(`  - Due today: ${data.dueToday.length} accounts`)
        console.log(`  - Due in 7 days: ${data.dueIn7Days.length} accounts`)
        console.log(`  - Due in 30 days: ${data.dueIn30Days.length} accounts`)
      } else {
        console.error('Failed to send daily notification')
      }

      return success
    } catch (error) {
      console.error('Error sending daily notification:', error)
      return false
    }
  }

  /**
   * Obtém lista de emails de destinatários das variáveis de ambiente
   */
  static getRecipientsFromEnv(): string[] {
    const recipients = process.env.NOTIFICATION_RECIPIENTS
    if (!recipients) {
      console.warn('No recipients configured in NOTIFICATION_RECIPIENTS environment variable')
      return []
    }

    // Suporta separação por vírgula ou ponto-e-vírgula
    return recipients
      .split(/[,;]/)
      .map((email) => email.trim())
      .filter((email) => email.length > 0)
  }
}
