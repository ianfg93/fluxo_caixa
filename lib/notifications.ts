export type NotificationType = "payment_due" | "payment_overdue" | "payment_completed" | "cash_flow_alert" | "system"

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  userId: string
  read: boolean
  createdAt: Date
  data?: any
}

export interface EmailTemplate {
  subject: string
  body: string
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "payment_overdue",
    title: "Conta em Atraso",
    message: "A conta da Distribuidora XYZ S.A. está vencida há 3 dias",
    userId: "1",
    read: false,
    createdAt: new Date("2024-03-18T09:00:00"),
    data: { accountId: "2", amount: 15000 },
  },
  {
    id: "2",
    type: "payment_due",
    title: "Vencimento Próximo",
    message: "A conta da Serviços Tech Solutions vence em 2 dias",
    userId: "1",
    read: false,
    createdAt: new Date("2024-03-17T14:30:00"),
    data: { accountId: "3", amount: 3500 },
  },
  {
    id: "3",
    type: "cash_flow_alert",
    title: "Saldo Baixo",
    message: "O saldo atual está abaixo do limite mínimo estabelecido",
    userId: "1",
    read: true,
    createdAt: new Date("2024-03-16T11:15:00"),
    data: { currentBalance: 5000, minimumBalance: 10000 },
  },
]

export class NotificationService {
  static getNotifications(userId: string): Notification[] {
    return mockNotifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  static getUnreadCount(userId: string): number {
    return mockNotifications.filter((n) => n.userId === userId && !n.read).length
  }

  static markAsRead(notificationId: string): void {
    const notification = mockNotifications.find((n) => n.id === notificationId)
    if (notification) {
      notification.read = true
    }
  }

  static markAllAsRead(userId: string): void {
    mockNotifications.filter((n) => n.userId === userId).forEach((n) => (n.read = true))
  }

  static createNotification(notification: Omit<Notification, "id" | "createdAt">): Notification {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
    }

    mockNotifications.unshift(newNotification)
    return newNotification
  }

  static deleteNotification(notificationId: string): boolean {
    const index = mockNotifications.findIndex((n) => n.id === notificationId)
    if (index === -1) return false

    mockNotifications.splice(index, 1)
    return true
  }
}

export class EmailService {
  static async sendEmail(to: string, subject: string, body: string): Promise<boolean> {

    await new Promise((resolve) => setTimeout(resolve, 1000))

    return Math.random() > 0.1
  }

  static getEmailTemplate(type: NotificationType, data: any): EmailTemplate {
    const templates: Record<NotificationType, (data: any) => EmailTemplate> = {
      payment_due: (data) => ({
        subject: "Lembrete: Conta a Vencer",
        body: `
          Olá,
          
          Este é um lembrete de que a conta "${data.description}" no valor de ${data.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} vence em ${data.daysUntilDue} dias.
          
          Fornecedor: ${data.supplierName}
          Data de Vencimento: ${new Date(data.dueDate).toLocaleDateString("pt-BR")}
          
          Por favor, providencie o pagamento dentro do prazo.
          
          Atenciosamente,
          Sistema de Fluxo de Caixa
        `,
      }),
      payment_overdue: (data) => ({
        subject: "URGENTE: Conta em Atraso",
        body: `
          Olá,
          
          A conta "${data.description}" no valor de ${data.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} está em atraso há ${data.daysOverdue} dias.
          
          Fornecedor: ${data.supplierName}
          Data de Vencimento: ${new Date(data.dueDate).toLocaleDateString("pt-BR")}
          
          É necessário regularizar este pagamento o mais breve possível.
          
          Atenciosamente,
          Sistema de Fluxo de Caixa
        `,
      }),
      payment_completed: (data) => ({
        subject: "Pagamento Realizado",
        body: `
          Olá,
          
          O pagamento da conta "${data.description}" foi realizado com sucesso.
          
          Valor Pago: ${data.paidAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          Data do Pagamento: ${new Date(data.paidDate).toLocaleDateString("pt-BR")}
          Fornecedor: ${data.supplierName}
          
          Atenciosamente,
          Sistema de Fluxo de Caixa
        `,
      }),
      cash_flow_alert: (data) => ({
        subject: "Alerta de Fluxo de Caixa",
        body: `
          Olá,
          
          ${data.message}
          
          Saldo Atual: ${data.currentBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          
          Recomendamos revisar o fluxo de caixa e tomar as medidas necessárias.
          
          Atenciosamente,
          Sistema de Fluxo de Caixa
        `,
      }),
      system: (data) => ({
        subject: data.subject || "Notificação do Sistema",
        body: data.body || data.message,
      }),
    }

    return templates[type](data)
  }
}
