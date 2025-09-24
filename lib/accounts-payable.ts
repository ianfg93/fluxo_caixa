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
  static async getAccountsPayable(status?: PaymentStatus): Promise<AccountPayable[]> {
    try {
      const url = status ? `/api/accounts-payable?status=${status}` : "/api/accounts-payable"
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch accounts payable")
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
      console.error("Get accounts payable error:", error)
      return []
    }
  }

  static async getSuppliers(): Promise<Supplier[]> {
    try {
      const response = await fetch("/api/suppliers")

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

  static async addAccountPayable(
    account: Omit<AccountPayable, "id" | "createdAt" | "supplierName">,
  ): Promise<AccountPayable | null> {
    try {
      const response = await fetch("/api/accounts-payable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(account),
      })

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

  static async addSupplier(supplier: Omit<Supplier, "id" | "createdAt">): Promise<Supplier | null> {
    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(supplier),
      })

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

  static async updateAccountPayable(id: string, updates: Partial<AccountPayable>): Promise<AccountPayable | null> {
    try {
      const response = await fetch(`/api/accounts-payable/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      })

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

  static async markAsPaid(id: string, paidAmount: number, paidDate: Date): Promise<AccountPayable | null> {
    try {
      const response = await fetch(`/api/accounts-payable/${id}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paidAmount, paidDate }),
      })

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

  static async getOverdueAccounts(): Promise<AccountPayable[]> {
    try {
      const response = await fetch("/api/accounts-payable?status=overdue")

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

  static async getUpcomingPayments(days = 7): Promise<AccountPayable[]> {
    try {
      const response = await fetch(`/api/accounts-payable/upcoming?days=${days}`)

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

  static async getTotalsByStatus(): Promise<Record<PaymentStatus, { count: number; amount: number }>> {
    const totals: Record<PaymentStatus, { count: number; amount: number }> = {
      pending: { count: 0, amount: 0 },
      paid: { count: 0, amount: 0 },
      overdue: { count: 0, amount: 0 },
      cancelled: { count: 0, amount: 0 },
    }

    try {
      const response = await fetch("/api/accounts-payable/totals")

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
