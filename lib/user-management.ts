import { ApiClient } from './api-client'

export interface User {
  id: string
  name: string
  email: string
  role: "operational" | "administrator" | "master"
  status: "active" | "inactive"
  createdAt: Date
  lastLogin?: Date
  createdBy: string
  companyName?: string
  user_type_id: number
  company_id: string
}

export interface CreateUserData {
  name: string
  email: string
  role: "operational" | "administrator" | "master"
  password: string
  company_id?: string // Opcional para usuário master escolher empresa
}

export interface UpdateUserData {
  name?: string
  email?: string
  role?: "operational" | "administrator" | "master"
  status?: "active" | "inactive"
  company_id?: string
}

export interface UserType {
  id: number
  name: string
  description: string
  level: number
}

export interface Company {
  id: string
  name: string
}

export class UserManagementService {
  static async getUsers(): Promise<User[]> {
    try {
      const response = await ApiClient.get("/api/users")
     
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
     
      const data = await response.json()
      return data.users.map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        lastLogin: user.lastLogin ? new Date(user.lastLogin) : undefined,
      }))
    } catch (error) {
      console.error("Get users error:", error)
      return []
    }
  }

  static async createUser(userData: CreateUserData): Promise<User | null> {
    try {
      const response = await ApiClient.post("/api/users", userData)
     
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create user")
      }
     
      const data = await response.json()
      return {
        ...data.user,
        createdAt: new Date(data.user.createdAt),
        lastLogin: data.user.lastLogin ? new Date(data.user.lastLogin) : undefined,
      }
    } catch (error) {
      console.error("Create user error:", error)
      throw error // Re-throw para que o form possa capturar o erro
    }
  }

  static async updateUser(id: string, updates: UpdateUserData): Promise<User | null> {
    try {
      const response = await ApiClient.put(`/api/users/${id}`, updates)
     
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update user")
      }
     
      const data = await response.json()
      return {
        ...data.user,
        createdAt: new Date(data.user.createdAt),
        lastLogin: data.user.lastLogin ? new Date(data.user.lastLogin) : undefined,
      }
    } catch (error) {
      console.error("Update user error:", error)
      throw error
    }
  }

  static async deleteUser(id: string): Promise<boolean> {
    try {
      const response = await ApiClient.delete(`/api/users/${id}`)
      return response.ok
    } catch (error) {
      console.error("Delete user error:", error)
      return false
    }
  }

  // Novas funções para suporte às melhorias

  static async getAvailableUserTypes(): Promise<UserType[]> {
    try {
      const response = await ApiClient.get("/api/user-types/available")
      
      if (!response.ok) {
        throw new Error("Failed to fetch user types")
      }
      
      return await response.json()
    } catch (error) {
      console.error("Get user types error:", error)
      return []
    }
  }

  static async getAllCompanies(): Promise<Company[]> {
    try {
      const response = await ApiClient.get("/api/companies?for_user_form=true")
      
      if (!response.ok) {
        throw new Error("Failed to fetch companies")
      }
      
      return await response.json()
    } catch (error) {
      console.error("Get companies error:", error)
      return []
    }
  }

  static async getCompanyById(companyId: string): Promise<Company> {
    try {
      const response = await ApiClient.get(`/api/companies/${companyId}`)
      
      if (!response.ok) {
        throw new Error("Company not found")
      }
      
      const data = await response.json()
      return {
        id: data.company.id,
        name: data.company.tradeName || data.company.name
      }
    } catch (error) {
      console.error("Get company error:", error)
      throw error
    }
  }

  // Função auxiliar para mapear role para user_type_id
  static mapRoleToUserTypeId(role: string): number {
    switch (role) {
      case 'master':
        return 1
      case 'administrator':
        return 2
      case 'operational':
        return 3
      default:
        return 3
    }
  }

  // Função auxiliar para mapear user_type para role
  static mapUserTypeToRole(userType: string): "operational" | "administrator" | "master" {
    switch (userType.toLowerCase()) {
      case 'master':
        return 'master'
      case 'administrator':
        return 'administrator'
      case 'operational':
        return 'operational'
      default:
        return 'operational'
    }
  }
}