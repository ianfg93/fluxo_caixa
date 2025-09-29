import { ApiClient } from './api-client'

export type PaymentStatus = "pending" | "paid" | "overdue" | "cancelled" | "partially_paid"
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
  supplierDocument?: string
  supplierEmail?: string
  supplierPhone?: string
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

export interface CreateAccountPayable {
  supplierName: string
  supplierDocument?: string
  supplierEmail?: string
  supplierPhone?: string
  description: string
  amount: number
  dueDate: Date
  issueDate: Date
  status?: PaymentStatus
  priority: PaymentPriority
  category: string
  invoiceNumber?: string
  notes?: string
}

export interface UpdateAccountPayable {
  supplierName?: string
  supplierDocument?: string
  supplierEmail?: string
  supplierPhone?: string
  description?: string
  amount?: number
  dueDate?: Date
  issueDate?: Date
  status?: PaymentStatus
  priority?: PaymentPriority
  category?: string
  invoiceNumber?: string
  notes?: string
}

export class AccountsPayableService {
  static async getAccountsPayable(status?: PaymentStatus): Promise<AccountPayable[]> {
    try {
      const url = status ? `/api/accounts-payable?status=${status}` : "/api/accounts-payable"
      
      const response = await ApiClient.get(url)

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      
      if (!data || !data.accounts || !Array.isArray(data.accounts)) {
        return []
      }

      const result = data.accounts.map((account: any) => ({
        ...account,
        dueDate: new Date(account.dueDate),
        issueDate: new Date(account.issueDate),
        paidDate: account.paidDate ? new Date(account.paidDate) : undefined,
        createdAt: new Date(account.createdAt),
      }))
      
      return result
    } catch (error) {
      return []
    }
  }

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
      return []
    }
  }

  static async addAccountPayable(
    account: CreateAccountPayable,
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
      return null
    }
  }

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
      return null
    }
  }

  static async updateAccountPayable(id: string, updates: UpdateAccountPayable): Promise<AccountPayable | null> {
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
      return null
    }
  }

  static async markAsPaid(id: string, paymentData: {
    paidAmount: number
    paidDate: Date
    paymentMethod?: string
    notes?: string
  }): Promise<AccountPayable | null> {
    try {
      const response = await ApiClient.post(`/api/accounts-payable/${id}/pay`, paymentData)

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
      return null
    }
}

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
      return []
    }
  }

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
      return []
    }
  }

  static async getTotalsByStatus(companyId?: string): Promise<Record<PaymentStatus, { count: number; amount: number }>> {
    const totals: Record<PaymentStatus, { count: number; amount: number }> = {
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
      partially_paid: { count: 0, amount: 0 },
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
      return totals
    }
  }

  static async deleteAccount(id: string): Promise<boolean> {
    try {
      const response = await ApiClient.delete(`/api/accounts-payable/${id}`)
      return response.ok
    } catch (error) {
      return false
    }
  }
}