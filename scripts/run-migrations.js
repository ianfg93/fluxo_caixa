require('dotenv').config()
const { Client } = require("pg")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

function getMigrationClientConfig() {
    const connectionString = process.env.DATABASE_POSTGRES_URL;

    if (connectionString) {
        return {
            connectionString: connectionString,
            ssl: {
                rejectUnauthorized: false, 
            },
        };
    }

    return {
        host: process.env.DATABASE_POSTGRES_HOST || 'localhost',
        database: process.env.DATABASE_POSTGRES_DATABASE || 'fluxo_caixa',
        user: process.env.DATABASE_POSTGRES_USER || 'postgres',
        password: process.env.DATABASE_POSTGRES_PASSWORD,
        port: Number.parseInt(process.env.DATABASE_POSTGRES_PORT || "5432"),
        
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    };
}

async function runMigrations() {
    const client = new Client(getMigrationClientConfig());

  console.log("🚀 Iniciando processo de migração...")
  
  try {
    await client.connect()
    console.log("🔌 Conectado ao PostgreSQL")

    // Lista completa de migrations na ordem correta
    const migrationFiles = [
      // "000_drop_all_tables.sql",
      // "001_create_user_types_table.sql",
      // "002_create_companies_table.sql",
      // "003_create_users_table.sql",
      // "004_create_cash_flow_table.sql",
      // "005_create_accounts_payable_table.sql",
      // "006_create_notifications_table.sql",
      // "007_create_file_uploads_table.sql",
      // "008_create_functions_and_triggers.sql",
      // "009_seed_initial_data.sql",
      // "010_create_migrations_control.sql",
      // "011_create_products_table.sql",
      // "012_create_vendors_table.sql",
      // "013_alter_accounts_payable.sql",
      // "014_add_price_to_products.sql",
      // "015_cleanup_accounts_payable.sql",
      // "016_add_open_order_service.sql",
      // "017_create_customers_table.sql",
      // "018_add_cod_barra_products.sql",
      //  "019_create_nfe_tables.sql"
      // "020_fix_nfe_trigger.sql",
      // "021_fix_stock_movement_type.sql",
      // "022_disable_nfe_triggers.sql",
      // "023_add_payment_category_to_nfe.sql",
      // "024_create_card_receivables.sql",
      // "025_add_payment_splits_to_cash_flow.sql",
      // "026_create_cash_register_table.sql",
      // "027_create_cash_withdrawals_table.sql",
      "028_enable_rls_security_supabase.sql", // 🔒 CORREÇÃO URGENTE: Habilitar RLS
      "029_fix_function_search_path.sql" // 🔒 CORREÇÃO: SQL Injection via search_path
    ]

    let executedCount = 0
    let skippedCount = 0

    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, file)
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  Arquivo ${file} não encontrado, pulando...`)
        skippedCount++
        continue
      }

      console.log(`📄 Executando ${file}...`)
      
      try {
        const startTime = Date.now()
        const sql = fs.readFileSync(filePath, "utf8")
        
        // Calcular checksum do arquivo
        const checksum = crypto.createHash('sha256').update(sql).digest('hex')
        
        // Executar em transação
        await client.query("BEGIN")
        await client.query(sql)
        
        // Se chegou até aqui, foi bem-sucedido
        const executionTime = Date.now() - startTime
        await client.query("COMMIT")
        
        executedCount++
        console.log(`✅ ${file} executado com sucesso (${executionTime}ms)`)
        
      } catch (error) {
        await client.query("ROLLBACK")
        console.error(`❌ Erro ao executar ${file}:`, error.message)
        
        // Para migrations críticas, parar o processo
        if (file.includes('000_drop') || file.includes('create_user_types') || file.includes('create_companies')) {
          throw new Error(`Migration crítica falhou: ${file}`)
        }
        
        console.log("⚠️  Continuando com próxima migration...")
        skippedCount++
      }
    }

    console.log("\n🎉 Processo de migração concluído!")
    console.log(`📊 Resumo:`)
    console.log(`  ✅ Executadas: ${executedCount}`)
    console.log(`  ⏭️  Puladas: ${skippedCount}`)

  } catch (error) {
    console.error("💥 Erro crítico:", error.message)
    console.log("\n🔧 Sugestões:")
    console.log("  1. Verificar se o banco de dados existe")
    console.log("  2. Confirmar credenciais no .env")
    console.log("  3. Verificar se PostgreSQL está rodando")
    console.log("  4. Verificar permissões do usuário do banco")
    process.exit(1)
  } finally {
    await client.end()
    console.log("🔌 Conexão fechada")
  }
}

// Função para fazer reset completo (desenvolvimento)
async function resetDatabase() {
  console.log("🧹 Fazendo reset completo do banco...")
  await runMigrations()
}

// Função para verificar status
async function checkStatus() {
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "fluxo_caixa", 
    user: process.env.DB_USERNAME || "sete_user",
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  })

  try {
    await client.connect()
    console.log("📊 Status do banco de dados:")
    
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `)
    
    if (tables.rows.length === 0) {
      console.log("❌ Nenhuma tabela encontrada - execute as migrations")
    } else {
      console.log(`✅ ${tables.rows.length} tabelas encontradas`)
      
      // Verificar dados
      const users = await client.query("SELECT COUNT(*) FROM users")
      const companies = await client.query("SELECT COUNT(*) FROM companies")
      
      console.log(`👥 Usuários: ${users.rows[0].count}`)
      console.log(`🏢 Empresas: ${companies.rows[0].count}`)
    }
    
  } catch (error) {
    console.error("❌ Erro ao verificar status:", error.message)
  } finally {
    await client.end()
  }
}

// CLI
const command = process.argv[2]

switch (command) {
  case 'reset':
    resetDatabase()
    break
  case 'status':
    checkStatus()
    break
  default:
    runMigrations()
}