require('dotenv').config()
const { Client } = require("pg")

async function seedBudgetTemplate() {
  const client = new Client({
    host: process.env.DATABASE_POSTGRES_HOST || "localhost",
    database: process.env.DATABASE_POSTGRES_DATABASE || "fluxo_caixa",
    user: process.env.DATABASE_POSTGRES_USER || "sete_user",
    password: process.env.DATABASE_POSTGRES_PASSWORD,
    port: process.env.DATABASE_POSTGRES_PORT || 5432,
  })

  try {
    await client.connect()
    console.log("🔄 Conectado ao PostgreSQL...")

    // Buscar todas as empresas
    const companiesResult = await client.query(`
      SELECT id, name FROM companies WHERE active = true
    `)

    console.log(`📊 Encontradas ${companiesResult.rows.length} empresa(s) ativa(s)`)

    // Buscar um usuário administrador de cada empresa
    for (const company of companiesResult.rows) {
      console.log(`\n🏢 Processando empresa: ${company.name}`)

      // Verificar se já existe um template padrão para esta empresa
      const existingTemplate = await client.query(`
        SELECT id FROM budget_templates
        WHERE company_id = $1 AND is_default = true
      `, [company.id])

      if (existingTemplate.rows.length > 0) {
        console.log(`  ✅ Template padrão já existe para ${company.name}`)
        continue
      }

      // Buscar usuário master ou administrator da empresa
      const userResult = await client.query(`
        SELECT u.id
        FROM users u
        JOIN user_types ut ON u.user_type_id = ut.id
        WHERE (u.company_id = $1 OR ut.name = 'master')
          AND u.active = true
          AND ut.name IN ('master', 'administrator')
        LIMIT 1
      `, [company.id])

      if (userResult.rows.length === 0) {
        console.log(`  ⚠️  Nenhum usuário admin encontrado para ${company.name}`)
        continue
      }

      const userId = userResult.rows[0].id

      // Criar template padrão
      const styles = JSON.stringify({
        primaryColor: '#2563eb',
        fontSize: '12px',
        fontFamily: 'Arial'
      })

      const headerText = `Este é um orçamento gerado pelo sistema de Fluxo de Caixa.
Todos os valores e condições estão sujeitos a confirmação.`

      const footerText = `Obrigado pela preferência!
Este orçamento tem validade de 30 dias a partir da data de emissão.`

      await client.query(`
        INSERT INTO budget_templates
        (company_id, name, is_default, logo_position, header_text, footer_text, styles, active, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        company.id,
        'Template Padrão',
        true,
        'top-center',
        headerText,
        footerText,
        styles,
        true,
        userId
      ])

      console.log(`  ✅ Template padrão criado para ${company.name}`)
    }

    console.log("\n✅ Processo concluído!")

  } catch (error) {
    console.error("❌ Erro:", error.message)
    console.error(error)
  } finally {
    await client.end()
    console.log("🔌 Conexão fechada")
  }
}

seedBudgetTemplate()
