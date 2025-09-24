import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updates = await request.json()
    const { id } = params

    const result = await query(
      `UPDATE cash_flow_transactions 
       SET description = $1, amount = $2, category = $3, date = $4, notes = $5, updated_at = NOW()
       WHERE id = $6 
       RETURNING *`,
      [
        updates.description,
        updates.amount,
        updates.category,
        updates.date,
        updates.notes,
        id,
      ],
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    const row = result.rows[0]
    const updatedTransaction = {
      id: row.id,
      type: row.type,
      description: row.description,
      amount: Number.parseFloat(row.amount),
      category: row.category,
      date: row.date,
      createdBy: row.created_by,
      createdAt: row.created_at,
      notes: row.notes,
    }

    return NextResponse.json({ transaction: updatedTransaction })
  } catch (error) {
    console.error("Update transaction API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const result = await query(
      "DELETE FROM cash_flow_transactions WHERE id = $1 RETURNING id",
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete transaction API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}