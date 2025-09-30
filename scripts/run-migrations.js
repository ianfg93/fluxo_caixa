require('dotenv').config()
const { Client } = require("pg")
const fs = require("fs")
const path = require("path")
const crypto = require("crypto")

const isProduction = process.env.IS_PRODUCTION === 'true';

async function runMigrations() {
  const connectionConfig = isProduction 
  ? { connectionString: process.env.DATABASE_URL,
      ssl: { 
        rejectUnauthorized: false, 
      },
    }
  : { 
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "fluxo_caixa",
      user: process.env.DB_USERNAME || "sete_user",
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,

    };
  
  const client = new Client(connectionConfig);

  console.log("🚀 Iniciando processo de migração...")
  console.log("⚠️  ATENÇÃO: Este processo irá APAGAR todos os dados existentes!")
  
  try {
    await client.connect()
    console.log("🔌 Conectado ao PostgreSQL")

    // Lista completa de migrations na ordem correta
    const migrationFiles = [
      // "000_drop_all_tables.sql",
      "001_create_user_types_table.sql",
      "002_create_companies_table.sql", 
      "003_create_users_table.sql",
      "004_create_cash_flow_table.sql",
      "005_create_accounts_payable_table.sql",
      "006_create_notifications_table.sql",
      "007_create_file_uploads_table.sql",
      "008_create_functions_and_triggers.sql",
      "009_seed_initial_data.sql",
      "010_create_migrations_control.sql"
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
    
    // Verificar estrutura final
    console.log("\n📋 Tabelas criadas:")
    const tables = await client.query(`
      SELECT 
        table_name,
        (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    
    tables.rows.forEach(table => {
      console.log(`  📋 ${table.table_name} (${table.column_count} colunas)`)
    })

    // Mostrar dados iniciais criados
    console.log("\n👥 Usuários criados:")
    const users = await client.query(`
      SELECT 
        u.name,
        u.email,
        ut.name as user_type,
        c.name as company
      FROM users u
      LEFT JOIN user_types ut ON u.user_type_id = ut.id
      LEFT JOIN companies c ON u.company_id = c.id
      ORDER BY ut.level, u.name
    `)
    
    users.rows.forEach(user => {
      const company = user.company ? ` (${user.company})` : ' (Sistema)'
      console.log(`  👤 ${user.name} - ${user.email} - ${user.user_type}${company}`)
    })

    console.log("\n🏢 Empresas criadas:")
    const companies = await client.query("SELECT name, cnpj, active FROM companies ORDER BY name")
    companies.rows.forEach(company => {
      const status = company.active ? '✅' : '❌'
      console.log(`  🏢 ${company.name} - ${company.cnpj} ${status}`)
    })

    console.log("\n💡 Próximos passos:")
    console.log("  1. Alterar senhas padrão dos usuários")
    console.log("  2. Configurar dados da sua empresa")
    console.log("  3. Criar usuários reais")
    console.log("  4. Testar funcionalidades")
    console.log("  5. Configurar backup automático")

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