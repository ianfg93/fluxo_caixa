import dotenv from 'dotenv'
import { AccountsPayableNotifications } from '../lib/accounts-payable-notifications'
import { emailService } from '../lib/email-service'

// Carregar variáveis de ambiente
dotenv.config()

console.log('🧪 Testing Email Notification System\n')
console.log('=' .repeat(60))

async function testEmail() {
  try {
    // 1. Verificar configuração
    console.log('\n📋 Step 1: Checking Configuration...')
    console.log('-'.repeat(60))

    const host = process.env.EMAIL_HOST
    const port = process.env.EMAIL_PORT
    const user = process.env.EMAIL_USER
    const pass = process.env.EMAIL_PASS?.substring(0, 4) + '****'

    console.log(`   Host: ${host || '❌ NOT SET'}`)
    console.log(`   Port: ${port || '❌ NOT SET'}`)
    console.log(`   User: ${user || '❌ NOT SET'}`)
    console.log(`   Pass: ${pass || '❌ NOT SET'}`)
    console.log(`   Notifications Enabled: ${process.env.EMAIL_NOTIFICATIONS_ENABLED || 'false'}`)

    if (!emailService.isConfigured()) {
      console.error('\n❌ Email service is not configured!')
      console.error('   Please check your .env file and make sure all EMAIL_* variables are set.')
      process.exit(1)
    }

    console.log('\n✅ Configuration looks good!')

    // 2. Testar conexão
    console.log('\n🔌 Step 2: Testing SMTP Connection...')
    console.log('-'.repeat(60))

    const connected = await emailService.verifyConnection()
    if (!connected) {
      console.error('\n❌ Failed to connect to SMTP server!')
      console.error('   Please check your credentials and network connection.')
      process.exit(1)
    }

    console.log('✅ SMTP connection successful!')

    // 3. Obter destinatários
    console.log('\n📧 Step 3: Getting Recipients...')
    console.log('-'.repeat(60))

    const recipients = AccountsPayableNotifications.getRecipientsFromEnv()
    if (recipients.length === 0) {
      console.error('\n❌ No recipients configured!')
      console.error('   Set NOTIFICATION_RECIPIENTS in your .env file.')
      process.exit(1)
    }

    console.log(`   Recipients: ${recipients.join(', ')}`)
    console.log(`   Total: ${recipients.length}`)

    // 4. Coletar dados de contas a pagar
    console.log('\n💰 Step 4: Collecting Accounts Payable Data...')
    console.log('-'.repeat(60))

    const data = await AccountsPayableNotifications.collectAccountsPayableData()

    console.log(`   Overdue: ${data.overdue.length} accounts (${formatCurrency(data.totalOverdue)})`)
    console.log(`   Due Today: ${data.dueToday.length} accounts (${formatCurrency(data.totalDueToday)})`)
    console.log(`   Due in 7 Days: ${data.dueIn7Days.length} accounts (${formatCurrency(data.totalDueIn7Days)})`)
    console.log(`   Due in 30 Days: ${data.dueIn30Days.length} accounts (${formatCurrency(data.totalDueIn30Days)})`)

    // 5. Enviar email
    console.log('\n📨 Step 5: Sending Test Email...')
    console.log('-'.repeat(60))

    const success = await AccountsPayableNotifications.sendDailyNotification(recipients)

    if (success) {
      console.log('\n✅ TEST SUCCESSFUL!')
      console.log(`   Email sent to: ${recipients.join(', ')}`)
      console.log('\n💡 Check your email inbox (or Mailtrap inbox if using Mailtrap)')
    } else {
      console.error('\n❌ TEST FAILED!')
      console.error('   Failed to send email. Check the logs above for details.')
      process.exit(1)
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ All tests passed!')
    console.log('='.repeat(60))
  } catch (error) {
    console.error('\n❌ Error during test:', error)
    process.exit(1)
  }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

// Executar teste
testEmail()
