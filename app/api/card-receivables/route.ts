import { type NextRequest, NextResponse } from "next/server"
import { query } from "@/lib/database"
import { ApiAuthService } from "@/lib/api-auth"

// GET /api/card-receivables - Get all card receivables calculated from cash_flow_transactions
export async function GET(request: NextRequest) {
  try {
    const user = await ApiAuthService.authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get card settings for rate and days calculation
    const settingsResult = await query(
      `SELECT * FROM card_settings WHERE company_id = $1`,
      [user.companyId]
    )

    let settings = settingsResult.rows[0]

    // If no settings exist, create default ones
    if (!settings) {
      const createSettingsResult = await query(
        `INSERT INTO card_settings (company_id, debit_rate, debit_days, credit_rate, credit_days)
         VALUES ($1, 0, 1, 0, 30)
         RETURNING *`,
        [user.companyId]
      )
      settings = createSettingsResult.rows[0]
    }

    // Get all entry transactions paid with card (debito or credito)
    const result = await query(
      `SELECT
        id,
        transaction_date,
        amount,
        payment_method,
        description,
        category
       FROM cash_flow_transactions
       WHERE company_id = $1
         AND type = 'entry'
         AND payment_method IN ('debito', 'credito')
         AND status = 'completed'
       ORDER BY transaction_date DESC`,
      [user.companyId]
    )

    // Calculate receivables with rates and settlement dates
    const receivables = result.rows.map((row) => {
      const cardType = row.payment_method as 'debito' | 'credito'
      const rateApplied = cardType === 'debito' ? settings.debit_rate : settings.credit_rate
      const settlementDays = cardType === 'debito' ? settings.debit_days : settings.credit_days

      // Calculate net amount: amount - (amount * rate / 100)
      const netAmount = row.amount - (row.amount * rateApplied / 100)

      // Calculate settlement date: transaction_date + settlementDays
      const transactionDate = new Date(row.transaction_date)
      const settlementDate = new Date(transactionDate)
      settlementDate.setDate(settlementDate.getDate() + settlementDays)

      return {
        id: row.id,
        transactionDate: row.transaction_date,
        grossAmount: parseFloat(row.amount),
        cardType: cardType,
        rateApplied: parseFloat(rateApplied),
        netAmount: parseFloat(netAmount.toFixed(2)),
        settlementDate: settlementDate.toISOString().split('T')[0],
        description: row.description,
        category: row.category
      }
    })

    return NextResponse.json({ items: receivables })
  } catch (error) {
    console.error("Error fetching card receivables:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
