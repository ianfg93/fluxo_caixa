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
  subscriptionPlan?: string
  createdAt: Date
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
      }))
    } catch (error) {
      console.error("Get companies error:", error)
      return []
    }
  }

  static async createCompany(
    company: Omit<Company, "id" | "active" | "createdAt">
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
}