import { NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        SUM(CASE WHEN type = 'entry' THEN amount ELSE 0 END) as entries,
        SUM(CASE WHEN type = 'exit' THEN amount ELSE 0 END) as exits
      FROM cash_flow_transactions
    `)

    const entries = Number.parseFloat(result.rows[0].entries) || 0
    const exits = Number.parseFloat(result.rows[0].exits) || 0

    return NextResponse.json({
      balance: {
        total: entries - exits,
        entries,
        exits,
      },
    })
  } catch (error) {
    console.error("Get balance API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
