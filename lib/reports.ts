import { CashFlowService } from "./cash-flow"
import { AccountsPayableService } from "./accounts-payable"

export interface MonthlyData {
  month: string
  entries: number
  exits: number
  balance: number
}

export interface CategoryData {
  category: string
  amount: number
  count: number
  percentage: number
}

export interface DashboardMetrics {
  totalBalance: number
  monthlyEntries: number
  monthlyExits: number
  pendingPayables: number
  overduePayables: number
  upcomingPayments: number
}

export class ReportsService {
  static async getDashboardMetrics(companyId?: string): Promise<DashboardMetrics> {
    try {
      const balance = await CashFlowService.getBalance(companyId)
      const payableTotals = await AccountsPayableService.getTotalsByStatus(companyId) // Agora funciona
      const upcomingPayments = await AccountsPayableService.getUpcomingPayments(7, companyId) // Agora funciona

      return {
        totalBalance: balance.total,
        monthlyEntries: balance.entries,
        monthlyExits: balance.exits,
        pendingPayables: payableTotals.pending.amount,
        overduePayables: payableTotals.overdue.amount,
        upcomingPayments: upcomingPayments.reduce((sum, p) => sum + p.amount, 0),
      }
    } catch (error) {
      console.error("Get dashboard metrics error:", error)
      return {
        totalBalance: 0,
        monthlyEntries: 0,
        monthlyExits: 0,
        pendingPayables: 0,
        overduePayables: 0,
        upcomingPayments: 0,
      }
    }
  }

  static async getMonthlyData(companyId?: string): Promise<MonthlyData[]> {
    try {
      const transactions = await CashFlowService.getTransactions(undefined, companyId)
      const monthlyMap = new Map<string, { entries: number; exits: number }>()

      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date()
        date.setMonth(date.getMonth() - i)
        const monthKey = date.toISOString().slice(0, 7) // YYYY-MM format
        monthlyMap.set(monthKey, { entries: 0, exits: 0 })
      }

      // Aggregate transactions by month
      transactions.forEach((transaction) => {
        const monthKey = new Date(transaction.date).toISOString().slice(0, 7)
        const monthData = monthlyMap.get(monthKey)

        if (monthData) {
          if (transaction.type === "entry") {
            monthData.entries += transaction.amount
          } else {
            monthData.exits += transaction.amount
          }
        }
      })

      // Convert to array format
      return Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month: new Date(month + "-01").toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
        }),
        entries: data.entries,
        exits: data.exits,
        balance: data.entries - data.exits,
      }))
    } catch (error) {
      console.error("Get monthly data error:", error)
      return []
    }
  }

  static async getCategoryBreakdown(type: "entry" | "exit", companyId?: string): Promise<CategoryData[]> {
    try {
      const transactions = await CashFlowService.getTransactions(type, companyId)
      const categoryMap = new Map<string, { amount: number; count: number }>()

      transactions.forEach((transaction) => {
        const existing = categoryMap.get(transaction.category) || { amount: 0, count: 0 }
        categoryMap.set(transaction.category, {
          amount: existing.amount + transaction.amount,
          count: existing.count + 1,
        })
      })

      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0)

      return Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category: category.charAt(0).toUpperCase() + category.slice(1),
          amount: data.amount,
          count: data.count,
          percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
    } catch (error) {
      console.error("Get category breakdown error:", error)
      return []
    }
  }

  static async getPayablesAnalysis() {
    try {
      const accounts = await AccountsPayableService.getAccountsPayable()
      const today = new Date()

      const analysis = {
        total: accounts.length,
        totalAmount: accounts.reduce((sum, a) => sum + a.amount, 0),
        pending: accounts.filter((a) => a.status === "pending").length,
        overdue: accounts.filter((a) => a.status === "pending" && new Date(a.dueDate) < today).length,
        paid: accounts.filter((a) => a.status === "paid").length,
        upcoming7Days: accounts.filter((a) => {
          const dueDate = new Date(a.dueDate)
          const in7Days = new Date()
          in7Days.setDate(today.getDate() + 7)
          return a.status === "pending" && dueDate >= today && dueDate <= in7Days
        }).length,
        byPriority: {
          urgent: accounts.filter((a) => a.priority === "urgent" && a.status === "pending").length,
          high: accounts.filter((a) => a.priority === "high" && a.status === "pending").length,
          medium: accounts.filter((a) => a.priority === "medium" && a.status === "pending").length,
          low: accounts.filter((a) => a.priority === "low" && a.status === "pending").length,
        },
      }

      return analysis
    } catch (error) {
      console.error("Get payables analysis error:", error)
      return {
        total: 0,
        totalAmount: 0,
        pending: 0,
        overdue: 0,
        paid: 0,
        upcoming7Days: 0,
        byPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
      }
    }
  }

  static async getCashFlowTrend(): Promise<{ date: string; balance: number }[]> {
    try {
      const transactions = (await CashFlowService.getTransactions()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      )

      let runningBalance = 0
      const trendData: { date: string; balance: number }[] = []

      transactions.forEach((transaction) => {
        if (transaction.type === "entry") {
          runningBalance += transaction.amount
        } else {
          runningBalance -= transaction.amount
        }

        trendData.push({
          date: new Date(transaction.date).toLocaleDateString("pt-BR"),
          balance: runningBalance,
        })
      })

      return trendData.slice(-30) // Last 30 data points
    } catch (error) {
      console.error("Get cash flow trend error:", error)
      return []
    }
  }
}
