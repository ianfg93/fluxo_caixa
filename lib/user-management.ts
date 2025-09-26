import { ApiClient } from './api-client'

export interface User {
  id: string
  name: string
  email: string
  role: "basic" | "manager" | "master"
  status: "active" | "inactive"
  createdAt: Date
  lastLogin?: Date
  createdBy: string
  companyName?: string
}

export interface CreateUserData {
  name: string
  email: string
  role: "basic" | "manager" | "master"
  password: string
}

export interface UpdateUserData {
  name?: string
  email?: string
  role?: "basic" | "manager" | "master"
  status?: "active" | "inactive"
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
        throw new Error("Failed to create user")
      }
      
      const data = await response.json()
      return {
        ...data.user,
        createdAt: new Date(data.user.createdAt),
        lastLogin: data.user.lastLogin ? new Date(data.user.lastLogin) : undefined,
      }
    } catch (error) {
      console.error("Create user error:", error)
      return null
    }
  }

  static async updateUser(id: string, updates: UpdateUserData): Promise<User | null> {
    try {
      const response = await ApiClient.put(`/api/users/${id}`, updates)
      
      if (!response.ok) {
        throw new Error("Failed to update user")
      }
      
      const data = await response.json()
      return {
        ...data.user,
        createdAt: new Date(data.user.createdAt),
        lastLogin: data.user.lastLogin ? new Date(data.user.lastLogin) : undefined,
      }
    } catch (error) {
      console.error("Update user error:", error)
      return null
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
}