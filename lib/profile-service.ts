import { ApiClient } from './api-client'

export interface UpdateProfileData {
  name: string
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export class ProfileService {
  static async updateProfile(data: UpdateProfileData): Promise<any> {
  try {
    const response = await ApiClient.put("/api/profile", data)


    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('ProfileService - Erro na API:', errorData)
      throw new Error(errorData.error || "Failed to update profile")
    }

    const result = await response.json()
    return result.user || true
  } catch (error) {
    console.error("ProfileService - Erro:", error)
    return false
  }
}

  static async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const response = await ApiClient.put("/api/profile/password", {
        currentPassword,
        newPassword
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to change password")
      }

      return true
    } catch (error) {
      console.error("Change password error:", error)
      return false
    }
  }
}