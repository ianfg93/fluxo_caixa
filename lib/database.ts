import { Client, Pool } from "pg"

let pool: Pool | null = null

export function getDbConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'fluxo_caixa',
    user: process.env.DB_USERNAME || 'sete_user',
    password: process.env.DB_PASSWORD,
    port: Number.parseInt(process.env.DB_PORT || "5432"),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  }
}

export async function getDbPool() {
  if (!pool) {
    pool = new Pool(getDbConfig())
    
    pool.on('error', (err) => {
      console.error('Database pool error:', err)
    })
    
    pool.on('connect', () => {
      console.log('Database connected successfully')
    })
  }
  return pool
}

export async function query(text: string, params?: any[]) {
  try {
    const pool = await getDbPool()
    const result = await pool.query(text, params)
    return result
  } catch (error) {
    console.error('Database query error:', error)
    console.error('Query:', text)
    console.error('Params:', params)
    
    throw error
  }
}

export async function testConnection() {
  try {
    const result = await query('SELECT NOW()')
    console.log('Database connection test successful:', result.rows[0])
    return true
  } catch (error) {
    console.error('Database connection test failed:', error)
    return false
  }
}

export async function closePool() {
  if (pool) {
    await pool.end()
    pool = null
  }
}