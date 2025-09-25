import { AuthService } from './auth'

export class ApiClient {
  private static getAuthHeaders(): HeadersInit {
    const token = AuthService.getToken()
    
    if (!token) {
      throw new Error('Usuário não autenticado')
    }

    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  }

  static async get(url: string): Promise<Response> {
    try {
      return await fetch(url, {
        headers: this.getAuthHeaders(),
      })
    } catch (error) {
      console.error('API GET error:', error)
      throw error
    }
  }

  static async post(url: string, data: any): Promise<Response> {
    try {
      return await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.error('API POST error:', error)
      throw error
    }
  }

  static async put(url: string, data: any): Promise<Response> {
    try {
      return await fetch(url, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.error('API PUT error:', error)
      throw error
    }
  }

  static async delete(url: string): Promise<Response> {
    try {
      return await fetch(url, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      })
    } catch (error) {
      console.error('API DELETE error:', error)
      throw error
    }
  }
}