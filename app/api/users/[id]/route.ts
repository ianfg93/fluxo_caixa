import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const updates = await request.json()
    const { id } = params

    const result = await query(
      `UPDATE users 
       SET name = $1, email = $2, role = $3, active = $4, updated_at = NOW()
       WHERE id = $5 
       RETURNING id, name, email, role, active, created_at`,
      [
        updates.name,
        updates.email,
        updates.role,
        updates.status === "active",
        id
      ]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const row = result.rows[0]
    const updatedUser = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.active ? "active" : "inactive",
      createdAt: row.created_at,
      createdBy: "Sistema"
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error("Update user API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const result = await query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [id]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete user API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}