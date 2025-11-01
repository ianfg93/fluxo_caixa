require('dotenv').config()
const { Client } = require("pg")

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

async function checkData() {
    const client = new Client(getMigrationClientConfig());

    console.log("🔍 Verificando dados do sistema...")

    try {
        await client.connect()
        console.log("✅ Conectado ao banco de dados\n")

        // Verificar empresas
        console.log("📊 EMPRESAS:")
        const companies = await client.query("SELECT id, name, cnpj FROM companies ORDER BY name")
        if (companies.rows.length === 0) {
            console.log("  ⚠️  Nenhuma empresa cadastrada")
        } else {
            companies.rows.forEach(c => {
                console.log(`  🏢 ${c.name} (${c.cnpj})`)
                console.log(`     ID: ${c.id}`)
            })
        }

        console.log("\n📦 FORNECEDORES:")
        const vendors = await client.query(`
            SELECT v.id, v.name, v.cnpj, c.name as company_name
            FROM vendors v
            INNER JOIN companies c ON v.company_id = c.id
            ORDER BY c.name, v.name
        `)
        if (vendors.rows.length === 0) {
            console.log("  ⚠️  Nenhum fornecedor cadastrado")
        } else {
            vendors.rows.forEach(v => {
                console.log(`  📦 ${v.name} (${v.cnpj})`)
                console.log(`     Empresa: ${v.company_name}`)
                console.log(`     ID: ${v.id}`)
            })
        }

        console.log("\n📦 PRODUTOS:")
        const products = await client.query(`
            SELECT p.id, p.code, p.name, p.quantity, p.price, c.name as company_name
            FROM products p
            INNER JOIN companies c ON p.company_id = c.id
            ORDER BY c.name, p.code
        `)
        if (products.rows.length === 0) {
            console.log("  ⚠️  Nenhum produto cadastrado")
        } else {
            products.rows.forEach(p => {
                console.log(`  📦 #${p.code} - ${p.name}`)
                console.log(`     Empresa: ${p.company_name}`)
                console.log(`     Estoque: ${p.quantity} | Preço: R$ ${p.price || 0}`)
                console.log(`     ID: ${p.id}`)
            })
        }

        console.log("\n👥 USUÁRIOS:")
        const users = await client.query(`
            SELECT u.id, u.name, u.email, ut.name as user_type, c.name as company_name
            FROM users u
            INNER JOIN user_types ut ON u.user_type_id = ut.id
            LEFT JOIN companies c ON u.company_id = c.id
            ORDER BY u.name
        `)
        users.rows.forEach(u => {
            console.log(`  👤 ${u.name} (${u.email})`)
            console.log(`     Tipo: ${u.user_type}`)
            console.log(`     Empresa: ${u.company_name || 'Sistema'}`)
            console.log(`     ID: ${u.id}`)
        })

        console.log("\n📋 NOTAS FISCAIS (NF-e):")
        const nfes = await client.query(`
            SELECT n.id, n.nfe_number, n.nfe_series, n.total_invoice, n.status,
                   v.name as vendor_name, c.name as company_name
            FROM nfe_invoices n
            INNER JOIN vendors v ON n.vendor_id = v.id
            INNER JOIN companies c ON n.company_id = c.id
            ORDER BY n.created_at DESC
            LIMIT 10
        `)
        if (nfes.rows.length === 0) {
            console.log("  ℹ️  Nenhuma NF-e cadastrada ainda")
        } else {
            nfes.rows.forEach(n => {
                console.log(`  📄 NF-e ${n.nfe_number}/${n.nfe_series} - ${n.vendor_name}`)
                console.log(`     Empresa: ${n.company_name}`)
                console.log(`     Valor: R$ ${n.total_invoice} | Status: ${n.status}`)
                console.log(`     ID: ${n.id}`)
            })
        }

        console.log("\n✅ Verificação concluída!")

    } catch (error) {
        console.error("❌ Erro:", error.message)
    } finally {
        await client.end()
    }
}

checkData()
