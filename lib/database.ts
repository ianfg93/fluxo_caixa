import { Client } from "pg"

let client: Client | null = null

export async function getDbClient() {
  if (!client) {
    client = new Client({
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      port: Number.parseInt(process.env.DB_PORT || "5432"),
    })
    await client.connect()
  }
  return client
}

export async function query(text: string, params?: any[]) {
  const client = await getDbClient()
  return client.query(text, params)
}
