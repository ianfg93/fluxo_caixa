const { Client } = require("pg")

async function seedDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    database: process.env.DB_NAME || "fluxo_caixa",
    user: process.env.DB_USERNAME || "sete_user",
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
  })

  try {
    await client.connect()
    console.log("🔄 Conectado ao PostgreSQL para popular dados...")

    // Insert test users
    console.log("👥 Inserindo usuários de teste...")
    await client.query(`
      INSERT INTO users (name, email, password, role) VALUES 
      ('João Silva', 'joao@empresa.com', crypt('123456', gen_salt('bf')), 'master'),
      ('Maria Santos', 'maria@empresa.com', crypt('123456', gen_salt('bf')), 'manager'),
      ('Pedro Costa', 'pedro@empresa.com', crypt('123456', gen_salt('bf')), 'basic')
      ON CONFLICT (email) DO NOTHING
    `)

    // Insert test suppliers
    console.log("🏢 Inserindo fornecedores de teste...")
    await client.query(`
      INSERT INTO suppliers (name, email, phone, cnpj, address) VALUES 
      ('Fornecedor ABC Ltda', 'contato@abc.com.br', '(11) 99999-9999', '12.345.678/0001-90', 'Rua das Flores, 123 - São Paulo, SP'),
      ('Distribuidora XYZ S.A.', 'financeiro@xyz.com.br', '(11) 88888-8888', '98.765.432/0001-10', 'Av. Paulista, 456 - São Paulo, SP'),
      ('Serviços Tech Solutions', 'admin@techsolutions.com.br', '(11) 77777-7777', '11.222.333/0001-44', 'Rua da Tecnologia, 789 - São Paulo, SP')
      ON CONFLICT (email) DO NOTHING
    `)

    // Insert test cash flow transactions
    console.log("💰 Inserindo transações de fluxo de caixa...")
    await client.query(`
      INSERT INTO cash_flow_transactions (type, description, amount, category, date, created_by, notes) VALUES 
      ('entry', 'Venda de produtos - Cliente ABC', 15000.00, 'vendas', '2024-03-15', 'João Silva', 'Pagamento à vista'),
      ('exit', 'Pagamento fornecedor XYZ', 8500.00, 'fornecedores', '2024-03-14', 'Maria Santos', NULL),
      ('entry', 'Prestação de serviços - Consultoria', 5000.00, 'servicos', '2024-03-13', 'Pedro Costa', NULL),
      ('exit', 'Salários funcionários', 25000.00, 'salarios', '2024-03-01', 'João Silva', NULL)
    `)

    // Get supplier IDs for accounts payable
    const suppliers = await client.query("SELECT id, name FROM suppliers ORDER BY name")

    // Insert test accounts payable
    console.log("📋 Inserindo contas a pagar...")
    await client.query(
      `
      INSERT INTO accounts_payable (supplier_id, description, amount, due_date, issue_date, status, priority, category, invoice_number, notes, created_by) VALUES 
      ($1, 'Compra de materiais de escritório', 2500.00, '2024-03-25', '2024-03-10', 'pending', 'medium', 'Material de Escritório', 'NF-001234', NULL, 'Maria Santos'),
      ($2, 'Fornecimento de produtos para revenda', 15000.00, '2024-03-20', '2024-03-05', 'overdue', 'high', 'Mercadorias', 'NF-005678', 'Pagamento em atraso - entrar em contato', 'João Silva'),
      ($3, 'Manutenção sistema ERP', 3500.00, '2024-03-30', '2024-03-15', 'pending', 'urgent', 'Serviços de TI', 'NF-009876', NULL, 'Pedro Costa')
    `,
      [suppliers.rows[0]?.id, suppliers.rows[1]?.id, suppliers.rows[2]?.id],
    )

    console.log("🎉 Dados de teste inseridos com sucesso!")
    console.log("\n📊 Resumo:")

    const userCount = await client.query("SELECT COUNT(*) FROM users")
    const supplierCount = await client.query("SELECT COUNT(*) FROM suppliers")
    const transactionCount = await client.query("SELECT COUNT(*) FROM cash_flow_transactions")
    const accountsCount = await client.query("SELECT COUNT(*) FROM accounts_payable")

    console.log(`  - Usuários: ${userCount.rows[0].count}`)
    console.log(`  - Fornecedores: ${supplierCount.rows[0].count}`)
    console.log(`  - Transações: ${transactionCount.rows[0].count}`)
    console.log(`  - Contas a pagar: ${accountsCount.rows[0].count}`)
  } catch (error) {
    console.error("❌ Erro ao popular o banco:", error.message)
  } finally {
    await client.end()
  }
}

seedDatabase()
