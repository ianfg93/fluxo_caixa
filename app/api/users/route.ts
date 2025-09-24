import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    const result = await query(
      "SELECT id, name, email, role, active, created_at FROM users ORDER BY created_at DESC"
    )

    const users = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.active ? "active" : "inactive",
      createdAt: row.created_at,
      createdBy: "Sistema", // Pode ser melhorado depois
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Get users API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()

    // Hash da senha usando pgcrypto
    const result = await query(
      `INSERT INTO users (name, email, password_hash, role, active) 
       VALUES ($1, $2, crypt($3, gen_salt('bf')), $4, $5) 
       RETURNING id, name, email, role, active, created_at`,
      [
        userData.name,
        userData.email,
        userData.password,
        userData.role,
        userData.status === "active"
      ]
    )

    const row = result.rows[0]
    const newUser = {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      status: row.active ? "active" : "inactive",
      createdAt: row.created_at,
      createdBy: "Sistema"
    }

    return NextResponse.json({ user: newUser })
  } catch (error) {
    console.error("Create user API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}