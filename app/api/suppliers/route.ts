import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET() {
  try {
    const result = await query("SELECT * FROM suppliers ORDER BY name ASC")

    const suppliers = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      cnpj: row.cnpj,
      address: row.address,
      createdAt: row.created_at,
    }))

    return NextResponse.json({ suppliers })
  } catch (error) {
    console.error("Get suppliers API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supplier = await request.json()

    const result = await query(
      "INSERT INTO suppliers (name, email, phone, cnpj, address) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [supplier.name, supplier.email, supplier.phone, supplier.cnpj, supplier.address],
    )

    const row = result.rows[0]
    const newSupplier = {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      cnpj: row.cnpj,
      address: row.address,
      createdAt: row.created_at,
    }

    return NextResponse.json({ supplier: newSupplier })
  } catch (error) {
    console.error("Add supplier API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
