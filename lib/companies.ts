import { ApiClient } from './api-client'

export interface Company {
  id: string
  name: string
  tradeName?: string
  cnpj?: string
  cpf?: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  active: boolean
  subscriptionPlan: string
  subscriptionExpiresAt?: Date
  maxUsers: number
  maxTransactionsPerMonth: number
  settings?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface CreateAdminData {
  name: string
  email: string
  password: string
}

export interface CreateCompanyWithAdminData {
  company: Omit<Company, "id" | "active" | "createdAt" | "updatedAt">
  admin: CreateAdminData
}

export class CompaniesService {
  static async getCompanies(): Promise<Company[]> {
    try {
      const response = await ApiClient.get("/api/companies")

      if (!response.ok) {
        throw new Error("Failed to fetch companies")
      }

      const data = await response.json()
      return data.companies.map((company: any) => ({
        ...company,
        createdAt: new Date(company.createdAt),
        updatedAt: new Date(company.updatedAt),
        subscriptionExpiresAt: company.subscriptionExpiresAt 
          ? new Date(company.subscriptionExpiresAt) 
          : undefined,
      }))
    } catch (error) {
      console.error("Get companies error:", error)
      return []
    }
  }

  static async getCompany(id: string): Promise<Company | null> {
    try {
      const response = await ApiClient.get(`/api/companies/${id}`)

      if (!response.ok) {
        throw new Error("Failed to fetch company")
      }

      const data = await response.json()
      return {
        ...data.company,
        createdAt: new Date(data.company.createdAt),
        updatedAt: new Date(data.company.updatedAt),
        subscriptionExpiresAt: data.company.subscriptionExpiresAt 
          ? new Date(data.company.subscriptionExpiresAt) 
          : undefined,
      }
    } catch (error) {
      console.error("Get company error:", error)
      return null
    }
  }

  static async createCompany(
    company: Omit<Company, "id" | "active" | "createdAt" | "updatedAt">
  ): Promise<Company | null> {
    try {
      const response = await ApiClient.post("/api/companies", company)

      if (!response.ok) {
        throw new Error("Failed to create company")
      }

      const data = await response.json()
      return {
        ...data.company,
        createdAt: new Date(data.company.createdAt),
      }
    } catch (error) {
      console.error("Create company error:", error)
      return null
    }
  }

  static async updateCompany(
    id: string,
    company: Partial<Omit<Company, "id" | "createdAt" | "updatedAt">>
  ): Promise<Company | null> {
    try {
      const response = await ApiClient.put(`/api/companies/${id}`, company)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update company")
      }

      const data = await response.json()
      return {
        ...data.company,
        createdAt: new Date(data.company.createdAt),
        updatedAt: new Date(data.company.updatedAt),
        subscriptionExpiresAt: data.company.subscriptionExpiresAt 
          ? new Date(data.company.subscriptionExpiresAt) 
          : undefined,
      }
    } catch (error) {
      console.error("Update company error:", error)
      return null
    }
  }

  static async toggleCompanyStatus(id: string): Promise<boolean> {
    try {
      const response = await ApiClient.patch(`/api/companies/${id}/toggle-status`)

      if (!response.ok) {
        throw new Error("Failed to toggle company status")
      }

      return true
    } catch (error) {
      console.error("Toggle company status error:", error)
      return false
    }
  }

  static async createCompanyWithAdmin(
    data: CreateCompanyWithAdminData
  ): Promise<{ company: Company; admin: { id: string; email: string } } | null> {
    try {
      const response = await ApiClient.post("/api/companies/with-admin", data)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to create company with admin")
      }

      const responseData = await response.json()
      return {
        company: {
          ...responseData.company,
          createdAt: new Date(responseData.company.createdAt),
          updatedAt: new Date(responseData.company.updatedAt),
          subscriptionExpiresAt: responseData.company.subscriptionExpiresAt 
            ? new Date(responseData.company.subscriptionExpiresAt) 
            : undefined,
        },
        admin: responseData.admin
      }
    } catch (error) {
      console.error("Create company with admin error:", error)
      return null
    }
  }
}