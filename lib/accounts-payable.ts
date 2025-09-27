import { ApiClient } from './api-client'

export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled"
export type PaymentPriority = "low" | "medium" | "high" | "urgent"

export interface Supplier {
  id: string
  name: string
  email: string
  phone: string
  cnpj: string
  address: string
  createdAt: Date
}

export interface AccountPayable {
  id: string
  supplierId: string
  supplierName: string
  description: string
  amount: number
  dueDate: Date
  issueDate: Date
  status: PaymentStatus
  priority: PaymentPriority
  category: string
  invoiceNumber?: string
  notes?: string
  paidDate?: Date
  paidAmount?: number
  createdBy: string
  createdAt: Date
}

export class AccountsPayableService {
  // ✅ CORRIGIDO: Usar ApiClient
  static async getAccountsPayable(status?: PaymentStatus): Promise<AccountPayable[]> {
    console.log('🔍 getAccountsPayable chamado com status:', status)
    
    try {
      const url = status ? `/api/accounts-payable?status=${status}` : "/api/accounts-payable"
      console.log('🔍 Fazendo fetch para:', url)
      
      const response = await ApiClient.get(url)
      console.log('🔍 Response status:', response.status)
      console.log('🔍 Response ok:', response.ok)

      if (!response.ok) {
        console.error(`API Error: ${response.status} - ${response.statusText}`)
        return []
      }

      const data = await response.json()
      console.log('🔍 Data recebida:', data)
      
      if (!data || !data.accounts || !Array.isArray(data.accounts)) {
        console.error('❌ API retornou dados inválidos:', data)
        return []
      }

      const result = data.accounts.map((account: any) => ({
        ...account,
        dueDate: new Date(account.dueDate),
        issueDate: new Date(account.issueDate),
        paidDate: account.paidDate ? new Date(account.paidDate) : undefined,
        createdAt: new Date(account.createdAt),
      }))
      
      console.log('🔍 Resultado final:', result)
      return result
    } catch (error) {
      console.error("❌ Get accounts payable error:", error)
      return []
    }
  }

  // ✅ CORRIGIDO: Usar ApiClient
  static async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await ApiClient.get("/api/suppliers")

      if (!response.ok) {
        throw new Error("Failed to fetch suppliers")
      }

      const data = await response.json()
      return data.suppliers.map((supplier: any) => ({
        ...supplier,
        createdAt: new Date(supplier.createdAt),
      }))
    } catch (error) {
      console.error("Get suppliers error:", error)
      return []
    }
  }

  // ✅ CORRIGIDO: Usar ApiClient e remover createdBy dos parâmetros
  static async addAccountPayable(
    account: Omit<AccountPayable, "id" | "createdAt" | "supplierName" | "createdBy">,
  ): Promise<AccountPayable | null> {
    try {
      const response = await ApiClient.post("/api/accounts-payable", account)

      if (!response.ok) {
        throw new Error("Failed to add account payable")
      }

      const data = await response.json()
      return {
        ...data.account,
        dueDate: new Date(data.account.dueDate),
        issueDate: new Date(data.account.issueDate),
        paidDate: data.account.paidDate ? new Date(data.account.paidDate) : undefined,
        createdAt: new Date(data.account.createdAt),
      }
    } catch (error) {
      console.error("Add account payable error:", error)
      return null
    }
  }

  // ✅ CORRIGIDO: Usar ApiClient
  static async addSupplier(supplier: Omit<Supplier, "id" | "createdAt">): Promise<Supplier | null> {
    try {
      const response = await ApiClient.post("/api/suppliers", supplier)

      if (!response.ok) {
        throw new Error("Failed to add supplier")
      }

      const data = await response.json()
      return {
        ...data.supplier,
        createdAt: new Date(data.supplier.createdAt),
      }
    } catch (error) {
      console.error("Add supplier error:", error)
      return null
    }
  }

  // ✅ CORRIGIDO: Usar ApiClient
  static async updateAccountPayable(id: string, updates: Partial<AccountPayable>): Promise<AccountPayable | null> {
    try {
      const response = await ApiClient.put(`/api/accounts-payable/${id}`, updates)

      if (!response.ok) {
        throw new Error("Failed to update account payable")
      }

      const data = await response.json()
      return {
        ...data.account,
        dueDate: new Date(data.account.dueDate),
        issueDate: new Date(data.account.issueDate),
        paidDate: data.account.paidDate ? new Date(data.account.paidDate) : undefined,
        createdAt: new Date(data.account.createdAt),
      }
    } catch (error) {
      console.error("Update account payable error:", error)
      return null
    }
  }

  // ✅ CORRIGIDO: Usar ApiClient
  static async markAsPaid(id: string, paidAmount: number, paidDate: Date): Promise<AccountPayable | null> {
    try {
      const response = await ApiClient.post(`/api/accounts-payable/${id}/pay`, { paidAmount, paidDate })

      if (!response.ok) {
        throw new Error("Failed to mark as paid")
      }

      const data = await response.json()
      return {
        ...data.account,
        dueDate: new Date(data.account.dueDate),
        issueDate: new Date(data.account.issueDate),
        paidDate: new Date(data.account.paidDate),
        createdAt: new Date(data.account.createdAt),
      }
    } catch (error) {
      console.error("Mark as paid error:", error)
      return null
    }
  }

  // ✅ CORRIGIDO: Usar ApiClient
  static async getOverdueAccounts(): Promise<AccountPayable[]> {
    try {
      const response = await ApiClient.get("/api/accounts-payable?status=overdue")

      if (!response.ok) {
        throw new Error("Failed to fetch overdue accounts")
      }

      const data = await response.json()
      return data.accounts.map((account: any) => ({
        ...account,
        dueDate: new Date(account.dueDate),
        issueDate: new Date(account.issueDate),
        paidDate: account.paidDate ? new Date(account.paidDate) : undefined,
        createdAt: new Date(account.createdAt),
      }))
    } catch (error) {
      console.error("Get overdue accounts error:", error)
      return []
    }
  }

  // ✅ CORRIGIDO: Usar ApiClient
  static async getUpcomingPayments(days = 7, companyId?: string): Promise<AccountPayable[]> {
    try {
      let url = `/api/accounts-payable/upcoming?days=${days}`
      
      if (companyId) {
        url += `&company=${companyId}`
      }

      const response = await ApiClient.get(url)

      if (!response.ok) {
        throw new Error("Failed to fetch upcoming payments")
      }

      const data = await response.json()
      return data.accounts.map((account: any) => ({
        ...account,
        dueDate: new Date(account.dueDate),
        issueDate: new Date(account.issueDate),
        paidDate: account.paidDate ? new Date(account.paidDate) : undefined,
        createdAt: new Date(account.createdAt),
      }))
    } catch (error) {
      console.error("Get upcoming payments error:", error)
      return []
    }
  }

  // ✅ CORRIGIDO: Usar ApiClient
  static async getTotalsByStatus(companyId?: string): Promise<Record<PaymentStatus, { count: number; amount: number }>> {
    const totals: Record<PaymentStatus, { count: number; amount: number }> = {
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    }

    try {
      let url = "/api/accounts-payable/totals"
      
      if (companyId) {
        url += `?company=${companyId}`
      }

      const response = await ApiClient.get(url)

      if (!response.ok) {
        throw new Error("Failed to fetch totals")
      }

      const data = await response.json()
      return data.totals
    } catch (error) {
      console.error("Get totals by status error:", error)
      return totals
    }
  }
}