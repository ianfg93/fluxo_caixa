require('dotenv').config()
const { Client } = require("pg")
const fs = require("fs")
const path = require("path")

async function runMigrations() {
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "fluxo_caixa",
    user: process.env.DB_USERNAME || "sete_user",
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  })

  try {
    await client.connect()
    console.log("Conectado ao PostgreSQL")

    // Lista de arquivos de migração na ordem
    const migrationFiles = [
      "001_create_users_table.sql",
      "002_create_cash_flow_table.sql",
      "003_create_accounts_payable_table.sql",
      "004_create_notifications_table.sql",
      "005_create_file_uploads_table.sql",
      "006_create_functions_and_triggers.sql",
    ]

    for (const file of migrationFiles) {
      const filePath = path.join(__dirname, file)
      if (fs.existsSync(filePath)) {
        console.log(`Executando ${file}...`)
        const sql = fs.readFileSync(filePath, "utf8")
        await client.query(sql)
        console.log(`✅ ${file} executado com sucesso`)
      } else {
        console.log(`⚠️  Arquivo ${file} não encontrado`)
      }
    }

    console.log("🎉 Todas as migrations foram executadas com sucesso!")
  } catch (error) {
    console.error("Erro ao executar migrations:", error)
  } finally {
    await client.end()
  }
}

runMigrations()