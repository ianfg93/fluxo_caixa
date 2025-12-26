import { ApiClient } from './api-client'
import { AuthService } from './auth'

export interface BudgetTemplate {
  id: string
  companyId: string
  name: string
  isDefault: boolean
  logoUrl?: string
  logoPosition: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  headerText?: string
  footerText?: string
  styles: {
    primaryColor: string
    fontSize: string
    fontFamily: string
  }
  active: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export class BudgetTemplateService {
  static async getTemplates(companyId?: string): Promise<BudgetTemplate[]> {
    try {
      let url = "/api/budget-templates"

      if (companyId) {
        url += `?company=${companyId}`
      }
      const response = await ApiClient.get(url)
      if (!response.ok) {
        throw new Error("Failed to fetch budget templates")
      }
      const data = await response.json()
      return data.templates.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      }))
    } catch (error) {
      console.error("Get budget templates error:", error)
      return []
    }
  }

  static async getTemplate(id: string): Promise<BudgetTemplate | null> {
    try {
      const response = await ApiClient.get(`/api/budget-templates/${id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch budget template")
      }
      const data = await response.json()
      return {
        ...data.template,
        createdAt: new Date(data.template.createdAt),
        updatedAt: new Date(data.template.updatedAt),
      }
    } catch (error) {
      console.error("Get budget template error:", error)
      return null
    }
  }

  static async getDefaultTemplate(companyId?: string): Promise<BudgetTemplate | null> {
    try {
      let url = "/api/budget-templates/default"

      if (companyId) {
        url += `?company=${companyId}`
      }
      const response = await ApiClient.get(url)
      if (!response.ok) {
        throw new Error("Failed to fetch default budget template")
      }
      const data = await response.json()
      return {
        ...data.template,
        createdAt: new Date(data.template.createdAt),
        updatedAt: new Date(data.template.updatedAt),
      }
    } catch (error) {
      console.error("Get default budget template error:", error)
      return null
    }
  }

  static async createTemplate(
    template: Omit<BudgetTemplate, "id" | "createdAt" | "updatedAt" | "companyId" | "createdBy">
  ): Promise<BudgetTemplate | null> {
    try {
      const response = await ApiClient.post("/api/budget-templates", template)
      if (!response.ok) {
        throw new Error("Failed to create budget template")
      }
      const data = await response.json()
      return {
        ...data.template,
        createdAt: new Date(data.template.createdAt),
        updatedAt: new Date(data.template.updatedAt),
      }
    } catch (error) {
      console.error("Create budget template error:", error)
      return null
    }
  }

  static async updateTemplate(
    id: string,
    updates: Partial<Omit<BudgetTemplate, "id" | "createdAt" | "updatedAt" | "companyId" | "createdBy">>
  ): Promise<BudgetTemplate | null> {
    try {
      const response = await ApiClient.put(`/api/budget-templates/${id}`, updates)
      if (!response.ok) {
        throw new Error("Failed to update budget template")
      }
      const data = await response.json()
      return {
        ...data.template,
        createdAt: new Date(data.template.createdAt),
        updatedAt: new Date(data.template.updatedAt),
      }
    } catch (error) {
      console.error("Update budget template error:", error)
      return null
    }
  }

  static async deleteTemplate(id: string): Promise<boolean> {
    try {
      const response = await ApiClient.delete(`/api/budget-templates/${id}`)
      return response.ok
    } catch (error) {
      console.error("Delete budget template error:", error)
      return false
    }
  }

  static async uploadLogo(file: File): Promise<string | null> {
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const token = AuthService.getToken()

      if (!token) {
        throw new Error("Usuário não autenticado")
      }

      const response = await fetch('/api/budget-templates/upload-logo', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error("Failed to upload logo")
      }

      const data = await response.json()
      return data.logoUrl
    } catch (error) {
      console.error("Upload logo error:", error)
      return null
    }
  }
}
