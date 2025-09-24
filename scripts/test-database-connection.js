const { Client } = require("pg")

async function testDatabaseConnection() {
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "fluxo_caixa",
    user: process.env.DB_USERNAME || "sete_user",
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  })

  try {
    console.log("🔄 Testando conexão com PostgreSQL...")
    await client.connect()
    console.log("✅ Conectado ao PostgreSQL com sucesso!")

    // Test basic query
    console.log("\n🔄 Testando consulta básica...")
    const result = await client.query("SELECT NOW() as current_time")
    console.log("✅ Consulta executada:", result.rows[0].current_time)

    // Check if tables exist
    console.log("\n🔄 Verificando se as tabelas existem...")
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)

    console.log("📋 Tabelas encontradas:")
    tables.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`)
    })

    // Test users table
    console.log("\n🔄 Testando tabela de usuários...")
    const userCount = await client.query("SELECT COUNT(*) FROM users")
    console.log(`✅ Usuários na base: ${userCount.rows[0].count}`)

    // Test cash flow table
    console.log("\n🔄 Testando tabela de fluxo de caixa...")
    const transactionCount = await client.query("SELECT COUNT(*) FROM cash_flow_transactions")
    console.log(`✅ Transações na base: ${transactionCount.rows[0].count}`)

    // Test accounts payable table
    console.log("\n🔄 Testando tabela de contas a pagar...")
    const accountsCount = await client.query("SELECT COUNT(*) FROM accounts_payable")
    console.log(`✅ Contas a pagar na base: ${accountsCount.rows[0].count}`)

    // Test suppliers table
    console.log("\n🔄 Testando tabela de fornecedores...")
    const suppliersCount = await client.query("SELECT COUNT(*) FROM suppliers")
    console.log(`✅ Fornecedores na base: ${suppliersCount.rows[0].count}`)

    console.log("\n🎉 Todos os testes passaram! O banco está funcionando corretamente.")
  } catch (error) {
    console.error("❌ Erro ao testar o banco de dados:", error.message)
    console.error("\n🔧 Possíveis soluções:")
    console.error("1. Verifique se o PostgreSQL está rodando")
    console.error("2. Confirme as variáveis de ambiente (.env.local)")
    console.error("3. Execute as migrations primeiro: node scripts/run-migrations.js")
    console.error("4. Verifique se o usuário tem permissões no banco")
  } finally {
    await client.end()
  }
}

testDatabaseConnection()
