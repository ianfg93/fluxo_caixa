import { ApiClient } from './api-client'

export interface Customer {
  id: string
  companyId: string
  name: string
  cpfCnpj?: string
  phone?: string
  email?: string
  address?: string
  active: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
  // Campos calculados
  totalDebt?: number
  totalPaid?: number
  balance?: number
}

export interface CustomerTransaction {
  id: string
  date: Date
  type: 'sale' | 'payment'
  description: string
  amount: number
  amountReceived: number
  paymentMethod?: string
  notes?: string
}

export class CustomerService {
  static async getCustomers(activeOnly: boolean = true): Promise<Customer[]> {
    try {
      const url = `/api/customers${activeOnly ? '?active=true' : ''}`
      const response = await ApiClient.get(url)

      if (!response.ok) {
        throw new Error("Failed to fetch customers")
      }

      const data = await response.json()

      return data.customers.map((c: any) => ({
        ...c,
        createdAt: new Date(c.createdAt),
        updatedAt: new Date(c.updatedAt),
      }))
    } catch (error) {
      console.error("Get customers error:", error)
      return []
    }
  }

  static async getCustomerById(id: string): Promise<Customer | null> {
    try {
      const response = await ApiClient.get(`/api/customers/${id}`)

      if (!response.ok) {
        throw new Error("Failed to fetch customer")
      }

      const data = await response.json()

      return {
        ...data.customer,
        createdAt: new Date(data.customer.createdAt),
        updatedAt: new Date(data.customer.updatedAt),
      }
    } catch (error) {
      console.error("Get customer error:", error)
      return null
    }
  }

  static async getCustomerTransactions(customerId: string): Promise<CustomerTransaction[]> {
    try {
      const response = await ApiClient.get(`/api/customers/${customerId}/transactions`)

      if (!response.ok) {
        throw new Error("Failed to fetch customer transactions")
      }

      const data = await response.json()

      return data.transactions.map((t: any) => ({
        ...t,
        date: new Date(t.date),
      }))
    } catch (error) {
      console.error("Get customer transactions error:", error)
      return []
    }
  }

  static async addCustomer(
    customer: Omit<Customer, "id" | "createdAt" | "updatedAt" | "createdBy" | "companyId" | "active">
  ): Promise<Customer | null> {
    try {
      const response = await ApiClient.post("/api/customers", customer)

      if (!response.ok) {
        throw new Error("Failed to add customer")
      }

      const data = await response.json()

      return {
        ...data.customer,
        createdAt: new Date(data.customer.createdAt),
        updatedAt: new Date(data.customer.updatedAt),
      }
    } catch (error) {
      console.error("Add customer error:", error)
      return null
    }
  }

  static async updateCustomer(
    id: string,
    updates: Partial<Customer>
  ): Promise<Customer | null> {
    try {
      const response = await ApiClient.put(`/api/customers/${id}`, updates)

      if (!response.ok) {
        throw new Error("Failed to update customer")
      }

      const data = await response.json()

      return {
        ...data.customer,
        createdAt: new Date(data.customer.createdAt),
        updatedAt: new Date(data.customer.updatedAt),
      }
    } catch (error) {
      console.error("Update customer error:", error)
      return null
    }
  }

  static async deleteCustomer(id: string): Promise<boolean> {
    try {
      const response = await ApiClient.delete(`/api/customers/${id}`)
      return response.ok
    } catch (error) {
      console.error("Delete customer error:", error)
      return false
    }
  }
}