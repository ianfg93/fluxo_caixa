import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")

    let sql = `
      SELECT ap.*, s.name as supplier_name 
      FROM accounts_payable ap 
      LEFT JOIN suppliers s ON ap.supplier_id = s.id 
      ORDER BY ap.due_date ASC, ap.created_at DESC
    `
    let params: any[] = []

    if (status) {
      sql = `
        SELECT ap.*, s.name as supplier_name 
        FROM accounts_payable ap 
        LEFT JOIN suppliers s ON ap.supplier_id = s.id 
        WHERE ap.status = $1 
        ORDER BY ap.due_date ASC, ap.created_at DESC
      `
      params = [status]
    }

    const result = await query(sql, params)

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
    console.error("Get accounts payable API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const account = await request.json()

    const result = await query(
      `INSERT INTO accounts_payable 
       (supplier_id, description, amount, due_date, issue_date, status, priority, category, invoice_number, notes, created_by) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING *`,
      [
        account.supplierId,
        account.description,
        account.amount,
        account.dueDate,
        account.issueDate,
        account.status,
        account.priority,
        account.category,
        account.invoiceNumber,
        account.notes,
        account.createdBy,
      ],
    )

    // Get supplier name
    const supplierResult = await query("SELECT name FROM suppliers WHERE id = $1", [account.supplierId])
    const supplierName = supplierResult.rows[0]?.name || "Fornecedor não encontrado"

    const row = result.rows[0]
    const newAccount = {
      id: row.id,
      supplierId: row.supplier_id,
      supplierName,
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
    }

    return NextResponse.json({ account: newAccount })
  } catch (error) {
    console.error("Add account payable API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
