import { NextRequest, NextResponse } from 'next/server'
import { AccountsPayableNotifications } from '@/lib/accounts-payable-notifications'
import { emailService } from '@/lib/email-service'

/**
 * API para testar envio de email de notificações
 * POST /api/notifications/test-email
 *
 * Body (opcional):
 * {
 *   "recipients": ["email@example.com"],
 *   "companyId": "optional-company-id"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar se o serviço de email está configurado
    if (!emailService.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email service is not configured. Please check your environment variables.',
          hint: 'Make sure EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS are set in .env',
        },
        { status: 500 }
      )
    }

    // Parse do body
    let body: any = {}
    try {
      body = await request.json()
    } catch {
      // Body vazio é permitido
    }

    // Obter destinatários (do body ou das variáveis de ambiente)
    let recipients: string[] = []
    if (body.recipients && Array.isArray(body.recipients)) {
      recipients = body.recipients
    } else if (body.recipients && typeof body.recipients === 'string') {
      recipients = [body.recipients]
    } else {
      // Usar destinatários das variáveis de ambiente
      recipients = AccountsPayableNotifications.getRecipientsFromEnv()
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No recipients specified',
          hint: 'Provide recipients in the request body or set NOTIFICATION_RECIPIENTS in .env',
        },
        { status: 400 }
      )
    }

    // Enviar notificação
    const companyId = body.companyId
    const success = await AccountsPayableNotifications.sendDailyNotification(
      recipients,
      companyId
    )

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Email sent successfully',
        recipients,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send email',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error in test-email endpoint:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/notifications/test-email
 * Retorna o status da configuração de email
 */
export async function GET() {
  try {
    const isConfigured = emailService.isConfigured()
    const recipients = AccountsPayableNotifications.getRecipientsFromEnv()

    let connectionStatus = 'not_tested'
    if (isConfigured) {
      try {
        const verified = await emailService.verifyConnection()
        connectionStatus = verified ? 'connected' : 'failed'
      } catch {
        connectionStatus = 'error'
      }
    }

    return NextResponse.json({
      configured: isConfigured,
      connectionStatus,
      recipientsCount: recipients.length,
      recipients: recipients.length > 0 ? recipients : undefined,
      enabled: process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true',
      cronSchedule: process.env.EMAIL_CRON_SCHEDULE || '0 9 * * *',
    })
  } catch (error) {
    console.error('Error checking email configuration:', error)
    return NextResponse.json(
      {
        error: 'Failed to check email configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
