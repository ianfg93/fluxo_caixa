import cron from 'node-cron'
import { AccountsPayableNotifications } from '../lib/accounts-payable-notifications'

/**
 * Configuração do Cron Job para notificações de email
 *
 * Horário: Todos os dias às 9h da manhã
 * Cron Expression: '0 9 * * *'
 *
 * Formato do Cron:
 * ┌───────────── minuto (0 - 59)
 * │ ┌───────────── hora (0 - 23)
 * │ │ ┌───────────── dia do mês (1 - 31)
 * │ │ │ ┌───────────── mês (1 - 12)
 * │ │ │ │ ┌───────────── dia da semana (0 - 6) (Domingo a Sábado)
 * │ │ │ │ │
 * * * * * *
 */

console.log('🚀 Starting Email Notifications Cron Job Service...')

// Verificar se as variáveis de ambiente estão configuradas
const emailEnabled = process.env.EMAIL_NOTIFICATIONS_ENABLED === 'true'

if (!emailEnabled) {
  console.log('⚠️  Email notifications are DISABLED')
  console.log('   Set EMAIL_NOTIFICATIONS_ENABLED=true to enable them')
  process.exit(0)
}

// Obter horário do cron das variáveis de ambiente ou usar padrão (9h)
const cronSchedule = process.env.EMAIL_CRON_SCHEDULE || '0 9 * * *'
console.log(`📅 Schedule: ${cronSchedule}`)

// Obter destinatários
const recipients = AccountsPayableNotifications.getRecipientsFromEnv()

if (recipients.length === 0) {
  console.error('❌ No recipients configured!')
  console.error('   Set NOTIFICATION_RECIPIENTS in your .env file')
  process.exit(1)
}

console.log(`📧 Recipients: ${recipients.join(', ')}`)

// Função que será executada pelo cron
async function sendDailyReport() {
  const timestamp = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
  })

  console.log(`\n${'='.repeat(60)}`)
  console.log(`🕐 Running scheduled task at: ${timestamp}`)
  console.log(`${'='.repeat(60)}\n`)

  try {
    const success = await AccountsPayableNotifications.sendDailyNotification(recipients)

    if (success) {
      console.log('✅ Daily report sent successfully!')
    } else {
      console.error('❌ Failed to send daily report')
    }
  } catch (error) {
    console.error('❌ Error in scheduled task:', error)
  }

  console.log(`\n${'='.repeat(60)}\n`)
}

// Criar o cron job
const job = cron.schedule(
  cronSchedule,
  async () => {
    await sendDailyReport()
  },
  {
    scheduled: true,
    timezone: 'America/Sao_Paulo',
  }
)

console.log('✅ Cron job scheduled successfully!')
console.log(`   Next execution: ${getNextExecutionTime(cronSchedule)}`)
console.log('\n💡 The service is now running in the background...')
console.log('   Press Ctrl+C to stop\n')

// Se estiver em modo de desenvolvimento, pode executar imediatamente para teste
if (process.env.RUN_IMMEDIATELY === 'true') {
  console.log('🧪 Running immediately for testing...\n')
  sendDailyReport()
}

/**
 * Calcula o próximo horário de execução
 */
function getNextExecutionTime(cronExpression: string): string {
  // Parse simples para expressão '0 9 * * *'
  const parts = cronExpression.split(' ')
  if (parts.length >= 2) {
    const hour = parts[1]
    const minute = parts[0]

    const now = new Date()
    const next = new Date()
    next.setHours(parseInt(hour), parseInt(minute), 0, 0)

    // Se já passou do horário de hoje, agendar para amanhã
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }

    return next.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return 'Unable to calculate'
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Stopping cron job service...')
  job.stop()
  console.log('✅ Service stopped successfully')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n\n👋 Stopping cron job service...')
  job.stop()
  console.log('✅ Service stopped successfully')
  process.exit(0)
})

// Manter o processo rodando
process.stdin.resume()
