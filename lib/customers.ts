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
  // Campos opcionais para compatibilidade com componentes existentes
  totalDebt?: number
  totalPaid?: number
  balance?: number
}

export interface CreateCustomerDTO {
  name: string
  cpfCnpj?: string
  phone?: string
  email?: string
  address?: string
}

export class CustomerService {
  static async getCustomers(activeOnly: boolean = true): Promise<Customer[]> {
    try {
      const params = new URLSearchParams()
      if (activeOnly) {
        params.append('active', 'true')
      }

      const response = await ApiClient.get(`/api/customers?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao buscar clientes')
      }

      const data = await response.json()
      return data.customers || []
    } catch (error) {
      console.error('Erro ao buscar clientes:', error)
      throw error
    }
  }

  static async getCustomer(id: string): Promise<Customer | null> {
    try {
      const response = await ApiClient.get(`/api/customers/${id}`)

      if (!response.ok) {
        if (response.status === 404) {
          return null
        }
        throw new Error('Erro ao buscar cliente')
      }

      const data = await response.json()
      return data.customer
    } catch (error) {
      console.error('Erro ao buscar cliente:', error)
      throw error
    }
  }

  static async createCustomer(customerData: CreateCustomerDTO): Promise<Customer> {
    try {
      const response = await ApiClient.post('/api/customers', customerData)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao criar cliente')
      }

      const data = await response.json()
      return data.customer
    } catch (error) {
      console.error('Erro ao criar cliente:', error)
      throw error
    }
  }

  static async updateCustomer(id: string, customerData: Partial<CreateCustomerDTO>): Promise<Customer> {
    try {
      const response = await ApiClient.put(`/api/customers/${id}`, customerData)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao atualizar cliente')
      }

      const data = await response.json()
      return data.customer
    } catch (error) {
      console.error('Erro ao atualizar cliente:', error)
      throw error
    }
  }

  static async deleteCustomer(id: string): Promise<void> {
    try {
      const response = await ApiClient.delete(`/api/customers/${id}`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao excluir cliente')
      }
    } catch (error) {
      console.error('Erro ao excluir cliente:', error)
      throw error
    }
  }
}
