import { ApiClient } from './api-client'

// Types
export type CardType = 'debito' | 'credito'

export interface CardSettings {
  id: string
  companyId: string
  debitRate: number
  debitDays: number
  creditRate: number
  creditDays: number
  createdAt: Date
  updatedAt: Date
}

export interface CardReceivable {
  id: string
  transactionDate: Date
  grossAmount: number
  cardType: CardType
  rateApplied: number
  netAmount: number
  settlementDate: Date
  description: string
  category: string
}

export interface UpdateCardSettings {
  debitRate?: number
  debitDays?: number
  creditRate?: number
  creditDays?: number
}

export interface CardReceivablesSummary {
  totalGross: number
  totalFees: number
  totalNet: number
}

// Service class
export class CardReceivablesService {
  // Get all card receivables (calculated from cash_flow_transactions)
  static async getCardReceivables(): Promise<CardReceivable[]> {
    const response = await ApiClient.get('/api/card-receivables')
    if (!response.ok) {
      throw new Error('Failed to fetch card receivables')
    }
    const data = await response.json()
    return data.items.map((item: any) => ({
      ...item,
      transactionDate: new Date(item.transactionDate),
      settlementDate: new Date(item.settlementDate),
    }))
  }

  // Get card settings
  static async getCardSettings(): Promise<CardSettings | null> {
    const response = await ApiClient.get('/api/card-receivables/settings')
    if (!response.ok) {
      return null
    }
    const settings = await response.json()
    return {
      ...settings,
      createdAt: new Date(settings.createdAt),
      updatedAt: new Date(settings.updatedAt),
    }
  }

  // Update card settings
  static async updateCardSettings(updates: UpdateCardSettings): Promise<CardSettings | null> {
    const response = await ApiClient.put('/api/card-receivables/settings', updates)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to update card settings')
    }
    const settings = await response.json()
    return {
      ...settings,
      createdAt: new Date(settings.createdAt),
      updatedAt: new Date(settings.updatedAt),
    }
  }

  // Calculate summary for a set of receivables
  static calculateSummary(receivables: CardReceivable[]): CardReceivablesSummary {
    return receivables.reduce(
      (acc, item) => ({
        totalGross: acc.totalGross + item.grossAmount,
        totalFees: acc.totalFees + (item.grossAmount - item.netAmount),
        totalNet: acc.totalNet + item.netAmount,
      }),
      { totalGross: 0, totalFees: 0, totalNet: 0 }
    )
  }
}
