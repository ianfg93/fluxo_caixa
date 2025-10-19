import { ApiClient } from './api-client'

export type TransactionType = "entry" | "exit"

export type TransactionCategory =
  | "vendas"
  | "servicos"
  | "investimentos"
  | "emprestimos"
  | "fornecedores"
  | "salarios"
  | "aluguel"
  | "impostos"
  | "marketing"
  | "outros"

// ✅ MODIFICADO: Adicionar "a_prazo"
export type PaymentMethod = "credito" | "debito" | "pix" | "dinheiro" | "a_prazo"

export interface CashFlowTransaction {
  id: string
  type: TransactionType
  description: string
  amount: number
  category: TransactionCategory
  date: Date
  createdBy: string
  createdAt: Date
  attachments?: string[]
  notes?: string
  paymentMethod?: PaymentMethod
  customerId?: string // ✅ NOVO
  customerName?: string // ✅ NOVO
  amountReceived?: number // ✅ NOVO
}

export class CashFlowService {
  // ✅ MODIFICADO: Adicionar "A Prazo"
  static getPaymentMethodOptions(): { value: PaymentMethod; label: string }[] {
    return [
      { value: "dinheiro", label: "Dinheiro" },
      { value: "pix", label: "PIX" },
      { value: "debito", label: "Débito" },
      { value: "credito", label: "Crédito" },
      { value: "a_prazo", label: "A Prazo" }, // ✅ NOVO
    ]
  }

  // ✅ MODIFICADO: Formatar "A Prazo"
  static formatPaymentMethod(method?: PaymentMethod): string {
    if (!method) return "Não informado"
    
    const methods: Record<PaymentMethod, string> = {
      dinheiro: "Dinheiro",
      pix: "PIX",
      debito: "Débito",
      credito: "Crédito",
      a_prazo: "A Prazo", // ✅ NOVO
    }
    
    return methods[method] || method
  }

  static async getTransactions(type?: TransactionType, companyId?: string): Promise<CashFlowTransaction[]> {
    try {
      let url = "/api/cash-flow"
      const params = new URLSearchParams()
     
      if (type) {
        params.append("type", type)
      }
     
      if (companyId) {
        params.append("company", companyId)
      }
     
      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await ApiClient.get(url)

      if (!response.ok) {
        throw new Error("Failed to fetch transactions")
      }

      const data = await response.json()

      return data.transactions.map((t: any) => ({
        ...t,
        date: new Date(t.date),
        createdAt: new Date(t.createdAt),
      }))
    } catch (error) {
      console.error("Get transactions error:", error)
      return []
    }
  }

  static async addTransaction(
    transaction: Omit<CashFlowTransaction, "id" | "createdAt" | "createdBy">,
  ): Promise<CashFlowTransaction | null> {
    try {
      const response = await ApiClient.post("/api/cash-flow", transaction)

      if (!response.ok) {
        throw new Error("Failed to add transaction")
      }

      const data = await response.json()

      return {
        ...data.transaction,
        date: new Date(data.transaction.date),
        createdAt: new Date(data.transaction.createdAt),
      }
    } catch (error) {
      console.error("Add transaction error:", error)
      return null
    }
  }

  static async updateTransaction(
    id: string,
    updates: Partial<CashFlowTransaction>,
  ): Promise<CashFlowTransaction | null> {
    try {
      const response = await ApiClient.put(`/api/cash-flow/${id}`, updates)

      if (!response.ok) {
        throw new Error("Failed to update transaction")
      }

      const data = await response.json()

      return {
        ...data.transaction,
        date: new Date(data.transaction.date),
        createdAt: new Date(data.transaction.createdAt),
      }
    } catch (error) {
      console.error("Update transaction error:", error)
      return null
    }
  }

  static async deleteTransaction(id: string): Promise<boolean> {
    try {
      const response = await ApiClient.delete(`/api/cash-flow/${id}`)
      return response.ok
    } catch (error) {
      console.error("Delete transaction error:", error)
      return false
    }
  }

  static async getBalance(companyId?: string): Promise<{ total: number; entries: number; exits: number }> {
    try {
      let url = "/api/cash-flow/balance"
     
      if (companyId) {
        url += `?company=${companyId}`
      }
     
      const response = await ApiClient.get(url)

      if (!response.ok) {
        throw new Error("Failed to fetch balance")
      }

      const data = await response.json()
      return data.balance
    } catch (error) {
      console.error("Get balance error:", error)
      return { total: 0, entries: 0, exits: 0 }
    }
  }

  static getCategoryOptions(type: TransactionType): TransactionCategory[] {
    if (type === "entry") {
      return ["vendas", "servicos", "investimentos", "emprestimos"]
    }
    return ["fornecedores", "salarios", "aluguel", "impostos", "marketing", "outros"]
  }
}