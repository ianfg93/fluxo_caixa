import { ApiClient } from './api-client'

export interface CashRegisterSession {
  id: string
  openingDate: string
  openingTime: string
  openingAmount: number
  closingTime?: string
  closingAmount?: number
  expectedAmount?: number
  difference?: number
  status: 'open' | 'closed'
  openingNotes?: string
  closingNotes?: string
  openedBy?: string
  closedBy?: string
  createdAt: string
}

export interface DailyReportSummary {
  openingAmount: number
  totalEntries: number
  totalExits: number
  totalWithdrawals: number
  finalBalance: number
  paymentTotals: Record<string, number>
}

export interface CashWithdrawal {
  id: string
  amount: number
  withdrawalDate: string
  withdrawalTime: string
  reason: string
  notes?: string
  withdrawnBy?: string
  createdAt: string
}

export interface DailyReport {
  date: string
  cashSession: CashRegisterSession | null
  summary: DailyReportSummary
  entries: any[]
  exits: any[]
  withdrawals: CashWithdrawal[]
  statistics: {
    totalTransactions: number
    averageTicket: number
  }
}

export class CashRegisterService {
  static async getSessions(status?: 'open' | 'closed', date?: string): Promise<CashRegisterSession[]> {
    try {
      let url = '/api/cash-register'
      const params = new URLSearchParams()

      if (status) params.append('status', status)
      if (date) params.append('date', date)

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await ApiClient.get(url)

      if (!response.ok) {
        throw new Error('Failed to fetch cash register sessions')
      }

      const data = await response.json()
      return data.sessions
    } catch (error) {
      console.error('Get cash register sessions error:', error)
      return []
    }
  }

  static async openCashRegister(
    openingAmount: number,
    openingNotes?: string,
    openingDate?: string
  ): Promise<CashRegisterSession | null> {
    try {
      const response = await ApiClient.post('/api/cash-register', {
        openingAmount,
        openingNotes,
        openingDate,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to open cash register')
      }

      const data = await response.json()
      return data.session
    } catch (error) {
      console.error('Open cash register error:', error)
      throw error
    }
  }

  static async closeCashRegister(
    sessionId: string,
    closingAmount: number,
    closingNotes?: string
  ): Promise<CashRegisterSession | null> {
    try {
      const response = await ApiClient.post(`/api/cash-register/${sessionId}/close`, {
        closingAmount,
        closingNotes,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to close cash register')
      }

      const data = await response.json()
      return data.session
    } catch (error) {
      console.error('Close cash register error:', error)
      throw error
    }
  }

  static async getDailyReport(date?: string): Promise<DailyReport | null> {
    try {
      let url = '/api/cash-register/daily-report'

      if (date) {
        url += `?date=${date}`
      }

      const response = await ApiClient.get(url)

      if (!response.ok) {
        throw new Error('Failed to fetch daily report')
      }

      const data = await response.json()
      return data.report
    } catch (error) {
      console.error('Get daily report error:', error)
      return null
    }
  }

  static formatCurrency(amount: number): string {
    return amount.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  static getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      dinheiro: 'Dinheiro',
      pix: 'PIX',
      debito: 'Débito',
      credito: 'Crédito',
      a_prazo: 'A Prazo',
      multiplas: 'Múltiplas Formas',
    }
    return labels[method] || method
  }

  static async getWithdrawals(date?: string): Promise<CashWithdrawal[]> {
    try {
      let url = '/api/cash-register/withdrawals'

      if (date) {
        url += `?date=${date}`
      }

      const response = await ApiClient.get(url)

      if (!response.ok) {
        throw new Error('Failed to fetch withdrawals')
      }

      const data = await response.json()
      return data.withdrawals
    } catch (error) {
      console.error('Get withdrawals error:', error)
      return []
    }
  }

  static async registerWithdrawal(
    amount: number,
    reason: string,
    notes?: string
  ): Promise<CashWithdrawal | null> {
    try {
      const response = await ApiClient.post('/api/cash-register/withdrawals', {
        amount,
        reason,
        notes,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to register withdrawal')
      }

      const data = await response.json()
      return data.withdrawal
    } catch (error) {
      console.error('Register withdrawal error:', error)
      throw error
    }
  }
}
