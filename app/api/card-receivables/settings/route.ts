import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

// GET /api/card-receivables/settings - Get card settings
export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const result = await query(
      `SELECT * FROM card_settings WHERE company_id = $1`,
      [user.companyId]
    )

    // If no settings exist, create default ones
    if (result.rows.length === 0) {
      const createResult = await query(
        `INSERT INTO card_settings (company_id, debit_rate, debit_days, credit_rate, credit_days)
         VALUES ($1, 0, 1, 0, 30)
         RETURNING *`,
        [user.companyId]
      )
      const row = createResult.rows[0]
      return NextResponse.json({
        id: row.id,
        companyId: row.company_id,
        debitRate: parseFloat(row.debit_rate),
        debitDays: parseInt(row.debit_days),
        creditRate: parseFloat(row.credit_rate),
        creditDays: parseInt(row.credit_days),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })
    }

    const row = result.rows[0]
    return NextResponse.json({
      id: row.id,
      companyId: row.company_id,
      debitRate: parseFloat(row.debit_rate),
      debitDays: parseInt(row.debit_days),
      creditRate: parseFloat(row.credit_rate),
      creditDays: parseInt(row.credit_days),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error) {
    console.error("Error fetching card settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// PUT /api/card-receivables/settings - Update card settings
export async function PUT(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check permission
    if (!ApiAuthService.hasPermission(user, "update")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const data = await request.json()

    // Validate data
    if (data.debitRate !== undefined && (data.debitRate < 0 || data.debitRate > 100)) {
      return NextResponse.json(
        { error: "Debit rate must be between 0 and 100" },
        { status: 400 }
      )
    }

    if (data.creditRate !== undefined && (data.creditRate < 0 || data.creditRate > 100)) {
      return NextResponse.json(
        { error: "Credit rate must be between 0 and 100" },
        { status: 400 }
      )
    }

    if (data.debitDays !== undefined && data.debitDays < 0) {
      return NextResponse.json(
        { error: "Debit days must be 0 or greater" },
        { status: 400 }
      )
    }

    if (data.creditDays !== undefined && data.creditDays < 0) {
      return NextResponse.json(
        { error: "Credit days must be 0 or greater" },
        { status: 400 }
      )
    }

    // Check if settings exist
    const existingResult = await query(
      `SELECT * FROM card_settings WHERE company_id = $1`,
      [user.companyId]
    )

    let result
    if (existingResult.rows.length === 0) {
      // Create new settings
      result = await query(
        `INSERT INTO card_settings (company_id, debit_rate, debit_days, credit_rate, credit_days)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          user.companyId,
          data.debitRate ?? 0,
          data.debitDays ?? 1,
          data.creditRate ?? 0,
          data.creditDays ?? 30
        ]
      )
    } else {
      // Update existing settings
      const existing = existingResult.rows[0]
      result = await query(
        `UPDATE card_settings
         SET debit_rate = $1,
             debit_days = $2,
             credit_rate = $3,
             credit_days = $4,
             updated_at = NOW()
         WHERE company_id = $5
         RETURNING *`,
        [
          data.debitRate ?? existing.debit_rate,
          data.debitDays ?? existing.debit_days,
          data.creditRate ?? existing.credit_rate,
          data.creditDays ?? existing.credit_days,
          user.companyId
        ]
      )
    }

    const row = result.rows[0]
    return NextResponse.json({
      id: row.id,
      companyId: row.company_id,
      debitRate: parseFloat(row.debit_rate),
      debitDays: parseInt(row.debit_days),
      creditRate: parseFloat(row.credit_rate),
      creditDays: parseInt(row.credit_days),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error) {
    console.error("Error updating card settings:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
