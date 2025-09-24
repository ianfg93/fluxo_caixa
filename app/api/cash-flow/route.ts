import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type")

    let sql = "SELECT * FROM cash_flow_transactions ORDER BY date DESC, created_at DESC"
    let params: any[] = []

    if (type) {
      sql = "SELECT * FROM cash_flow_transactions WHERE type = $1 ORDER BY date DESC, created_at DESC"
      params = [type]
    }

    const result = await query(sql, params)

    const transactions = result.rows.map((row) => ({
      id: row.id,
      type: row.type,
      description: row.description,
      amount: Number.parseFloat(row.amount),
      category: row.category,
      date: row.date,
      createdBy: row.created_by,
      createdAt: row.created_at,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      notes: row.notes,
    }))

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error("Get transactions API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const transaction = await request.json()

    const result = await query(
      `INSERT INTO cash_flow_transactions 
       (type, description, amount, category, date, created_by, attachments, notes) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [
        transaction.type,
        transaction.description,
        transaction.amount,
        transaction.category,
        transaction.date,
        transaction.createdBy,
        transaction.attachments ? JSON.stringify(transaction.attachments) : null,
        transaction.notes,
      ],
    )

    const row = result.rows[0]
    const newTransaction = {
      id: row.id,
      type: row.type,
      description: row.description,
      amount: Number.parseFloat(row.amount),
      category: row.category,
      date: row.date,
      createdBy: row.created_by,
      createdAt: row.created_at,
      attachments: row.attachments ? JSON.parse(row.attachments) : undefined,
      notes: row.notes,
    }

    return NextResponse.json({ transaction: newTransaction })
  } catch (error) {
    console.error("Add transaction API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
