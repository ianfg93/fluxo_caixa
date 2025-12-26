require('dotenv').config()
const { Client } = require('pg')

function getMigrationClientConfig() {
  const connectionString = process.env.DATABASE_POSTGRES_URL

  if (connectionString) {
    return {
      connectionString: connectionString,
      ssl: {
        rejectUnauthorized: false,
      },
    }
  }

  return {
    host: process.env.DATABASE_POSTGRES_HOST || 'localhost',
    database: process.env.DATABASE_POSTGRES_DATABASE || 'fluxo_caixa',
    user: process.env.DATABASE_POSTGRES_USER || 'postgres',
    password: process.env.DATABASE_POSTGRES_PASSWORD,
    port: Number.parseInt(process.env.DATABASE_POSTGRES_PORT || '5432'),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  }
}

async function cleanupOldBudgets() {
  const client = new Client(getMigrationClientConfig())

  console.log('🧹 Iniciando limpeza de orçamentos antigos...')

  try {
    await client.connect()
    console.log('🔌 Conectado ao PostgreSQL')

    // Calcular data de 30 dias atrás
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Contar orçamentos que serão excluídos
    const countResult = await client.query(
      `SELECT COUNT(*) as count
       FROM budgets
       WHERE created_at < $1
         AND status IN ('draft', 'rejected', 'expired')`,
      [thirtyDaysAgo]
    )

    const count = parseInt(countResult.rows[0].count)

    if (count === 0) {
      console.log('✅ Nenhum orçamento antigo encontrado para exclusão')
      return
    }

    console.log(`📊 Encontrados ${count} orçamentos para exclusão`)
    console.log(`📅 Data de corte: ${thirtyDaysAgo.toLocaleDateString('pt-BR')}`)

    // Buscar detalhes dos orçamentos que serão excluídos (para log)
    const budgetsResult = await client.query(
      `SELECT id, budget_number, status, created_at
       FROM budgets
       WHERE created_at < $1
         AND status IN ('draft', 'rejected', 'expired')
       ORDER BY created_at ASC`,
      [thirtyDaysAgo]
    )

    console.log('\n📋 Orçamentos que serão excluídos:')
    budgetsResult.rows.forEach((budget) => {
      console.log(
        `  - ${budget.budget_number} (${budget.status}) - Criado em ${new Date(budget.created_at).toLocaleDateString('pt-BR')}`
      )
    })

    // Executar exclusão em uma transação
    await client.query('BEGIN')

    try {
      // Primeiro excluir os itens (devido à constraint de foreign key)
      const deleteItemsResult = await client.query(
        `DELETE FROM budget_items
         WHERE budget_id IN (
           SELECT id FROM budgets
           WHERE created_at < $1
             AND status IN ('draft', 'rejected', 'expired')
         )`,
        [thirtyDaysAgo]
      )

      console.log(`\n🗑️  Itens excluídos: ${deleteItemsResult.rowCount}`)

      // Depois excluir os orçamentos
      const deleteBudgetsResult = await client.query(
        `DELETE FROM budgets
         WHERE created_at < $1
           AND status IN ('draft', 'rejected', 'expired')`,
        [thirtyDaysAgo]
      )

      console.log(`🗑️  Orçamentos excluídos: ${deleteBudgetsResult.rowCount}`)

      await client.query('COMMIT')
      console.log('\n✅ Limpeza concluída com sucesso!')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    }
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error.message)
    console.error('\n🔧 Sugestões:')
    console.error('  1. Verificar se o banco de dados está acessível')
    console.error('  2. Confirmar credenciais no .env')
    console.error('  3. Verificar se PostgreSQL está rodando')
    process.exit(1)
  } finally {
    await client.end()
    console.log('🔌 Conexão fechada')
  }
}

// Verificar se deve fazer dry-run (apenas mostrar o que seria excluído)
const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-d')

if (isDryRun) {
  console.log('⚠️  MODO DRY-RUN: Apenas mostrando o que seria excluído\n')

  async function dryRun() {
    const client = new Client(getMigrationClientConfig())

    try {
      await client.connect()

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const result = await client.query(
        `SELECT id, budget_number, status, created_at, customer_name
         FROM budgets
         WHERE created_at < $1
           AND status IN ('draft', 'rejected', 'expired')
         ORDER BY created_at ASC`,
        [thirtyDaysAgo]
      )

      console.log(`📊 ${result.rows.length} orçamentos seriam excluídos:`)
      console.log(`📅 Data de corte: ${thirtyDaysAgo.toLocaleDateString('pt-BR')}\n`)

      result.rows.forEach((budget) => {
        console.log(
          `  - ${budget.budget_number} | ${budget.customer_name || 'Sem cliente'} | ` +
          `${budget.status} | Criado: ${new Date(budget.created_at).toLocaleDateString('pt-BR')}`
        )
      })

      console.log('\n💡 Execute sem --dry-run para realizar a exclusão')
    } catch (error) {
      console.error('❌ Erro:', error.message)
    } finally {
      await client.end()
    }
  }

  dryRun()
} else {
  cleanupOldBudgets()
}
