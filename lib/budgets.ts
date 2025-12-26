import { ApiClient } from './api-client'
import { AuthService } from './auth'

export interface Budget {
  id: string
  companyId: string
  templateId: string
  customerId?: string
  budgetNumber: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  issueDate: Date
  validityDate?: Date
  subtotal: number
  discount: number
  total: number
  notes?: string
  status: 'draft' | 'sent' | 'approved' | 'rejected' | 'expired'
  createdBy: string
  createdAt: Date
  updatedAt: Date
  items?: BudgetItem[]
}

export interface BudgetItem {
  id: string
  budgetId: string
  productId?: string
  itemType: 'product' | 'custom'
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
  displayOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateBudgetDTO {
  templateId: string
  customerId?: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  customerAddress?: string
  issueDate?: Date
  validityDate?: Date
  discount?: number
  notes?: string
  items: Array<{
    productId?: string
    itemType: 'product' | 'custom'
    description: string
    quantity: number
    unitPrice: number
  }>
}

export class BudgetService {
  static async getBudgets(companyId?: string, filters?: {
    status?: string
    startDate?: Date
    endDate?: Date
  }): Promise<Budget[]> {
    try {
      let url = "/api/budgets"
      const params = new URLSearchParams()

      if (companyId) {
        params.append('company', companyId)
      }
      if (filters?.status) {
        params.append('status', filters.status)
      }
      if (filters?.startDate) {
        params.append('startDate', filters.startDate.toISOString())
      }
      if (filters?.endDate) {
        params.append('endDate', filters.endDate.toISOString())
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await ApiClient.get(url)
      if (!response.ok) {
        throw new Error("Failed to fetch budgets")
      }
      const data = await response.json()
      return data.budgets.map((b: any) => ({
        ...b,
        issueDate: new Date(b.issueDate),
        validityDate: b.validityDate ? new Date(b.validityDate) : undefined,
        createdAt: new Date(b.createdAt),
        updatedAt: new Date(b.updatedAt),
      }))
    } catch (error) {
      console.error("Get budgets error:", error)
      return []
    }
  }

  static async getBudget(id: string): Promise<Budget | null> {
    try {
      const response = await ApiClient.get(`/api/budgets/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch budget")
      }
      const data = await response.json()
      return {
        ...data.budget,
        issueDate: new Date(data.budget.issueDate),
        validityDate: data.budget.validityDate ? new Date(data.budget.validityDate) : undefined,
        createdAt: new Date(data.budget.createdAt),
        updatedAt: new Date(data.budget.updatedAt),
        items: data.budget.items?.map((item: any) => ({
          ...item,
          createdAt: new Date(item.createdAt),
          updatedAt: new Date(item.updatedAt),
        }))
      }
    } catch (error) {
      console.error("Get budget error:", error)
      return null
    }
  }

  static async createBudget(budget: CreateBudgetDTO): Promise<Budget | null> {
    try {
      const response = await ApiClient.post("/api/budgets", budget)
      if (!response.ok) {
        throw new Error("Failed to create budget")
      }
      const data = await response.json()
      return {
        ...data.budget,
        issueDate: new Date(data.budget.issueDate),
        validityDate: data.budget.validityDate ? new Date(data.budget.validityDate) : undefined,
        createdAt: new Date(data.budget.createdAt),
        updatedAt: new Date(data.budget.updatedAt),
      }
    } catch (error) {
      console.error("Create budget error:", error)
      return null
    }
  }

  static async updateBudget(
    id: string,
    updates: Partial<Omit<Budget, "id" | "createdAt" | "updatedAt" | "companyId" | "createdBy" | "budgetNumber">>
  ): Promise<Budget | null> {
    try {
      const response = await ApiClient.put(`/api/budgets/${id}`, updates)
      if (!response.ok) {
        throw new Error("Failed to update budget")
      }
      const data = await response.json()
      return {
        ...data.budget,
        issueDate: new Date(data.budget.issueDate),
        validityDate: data.budget.validityDate ? new Date(data.budget.validityDate) : undefined,
        createdAt: new Date(data.budget.createdAt),
        updatedAt: new Date(data.budget.updatedAt),
      }
    } catch (error) {
      console.error("Update budget error:", error)
      return null
    }
  }

  static async deleteBudget(id: string): Promise<boolean> {
    try {
      const response = await ApiClient.delete(`/api/budgets/${id}`)
      return response.ok
    } catch (error) {
      console.error("Delete budget error:", error)
      return false
    }
  }

  static async updateBudgetStatus(
    id: string,
    status: Budget['status']
  ): Promise<Budget | null> {
    try {
      const response = await ApiClient.put(`/api/budgets/${id}/status`, { status })
      if (!response.ok) {
        throw new Error("Failed to update budget status")
      }
      const data = await response.json()
      return {
        ...data.budget,
        issueDate: new Date(data.budget.issueDate),
        validityDate: data.budget.validityDate ? new Date(data.budget.validityDate) : undefined,
        createdAt: new Date(data.budget.createdAt),
        updatedAt: new Date(data.budget.updatedAt),
      }
    } catch (error) {
      console.error("Update budget status error:", error)
      return null
    }
  }

  // Alias para updateBudgetStatus
  static async updateStatus(id: string, status: Budget['status']): Promise<Budget | null> {
    return this.updateBudgetStatus(id, status)
  }

  static async generatePDF(id: string): Promise<Blob | null> {
    try {
      const token = AuthService.getToken()

      if (!token) {
        throw new Error("Usuário não autenticado")
      }

      const response = await fetch(`/api/budgets/${id}/pdf`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      })

      if (!response.ok) {
        throw new Error("Failed to generate PDF")
      }

      return await response.blob()
    } catch (error) {
      console.error("Generate PDF error:", error)
      return null
    }
  }

  static formatPrice(price: number): string {
    return price.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  static getStatusLabel(status: Budget['status']): string {
    const labels: Record<Budget['status'], string> = {
      draft: 'Rascunho',
      sent: 'Enviado',
      approved: 'Aprovado',
      rejected: 'Rejeitado',
      expired: 'Expirado',
    }
    return labels[status] || status
  }

  static getStatusColor(status: Budget['status']): string {
    const colors: Record<Budget['status'], string> = {
      draft: 'gray',
      sent: 'blue',
      approved: 'green',
      rejected: 'red',
      expired: 'orange',
    }
    return colors[status] || 'gray'
  }
}
