import { NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET() {
  try {
    const result = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        SUM(amount) as amount
      FROM accounts_payable 
      GROUP BY status
    `)

    const totals = {
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    }

    result.rows.forEach((row) => {
      totals[row.status as keyof typeof totals] = {
        count: Number.parseInt(row.count),
        amount: Number.parseFloat(row.amount),
      }
    })

    return NextResponse.json({ totals })
  } catch (error) {
    console.error("Get totals by status API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
