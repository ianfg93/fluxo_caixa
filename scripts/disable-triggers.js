const { query } = require('../lib/database.ts')
const fs = require('fs')

async function disableTriggers() {
  try {
    console.log('🔧 Desabilitando triggers de NF-e...')

    const sql = fs.readFileSync('./scripts/022_disable_nfe_triggers.sql', 'utf8')
    await query(sql)

    console.log('✅ Triggers desabilitados com sucesso!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Erro:', error)
    process.exit(1)
  }
}

disableTriggers()
