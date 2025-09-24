import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "7")

    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(today.getDate() + days)

    const result = await query(
      `
      SELECT ap.*, s.name as supplier_name 
      FROM accounts_payable ap 
      LEFT JOIN suppliers s ON ap.supplier_id = s.id 
      WHERE ap.status = 'pending' AND ap.due_date >= $1 AND ap.due_date <= $2 
      ORDER BY ap.due_date ASC, ap.created_at DESC
    `,
      [today, futureDate],
    )

    const accounts = result.rows.map((row) => ({
      id: row.id,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name || "Fornecedor não encontrado",
      description: row.description,
      amount: Number.parseFloat(row.amount),
      dueDate: row.due_date,
      issueDate: row.issue_date,
      status: row.status,
      priority: row.priority,
      category: row.category,
      invoiceNumber: row.invoice_number,
      notes: row.notes,
      paidDate: row.paid_date,
      paidAmount: row.paid_amount ? Number.parseFloat(row.paid_amount) : undefined,
      createdBy: row.created_by,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ accounts })
  } catch (error) {
    console.error("Get upcoming payments API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
