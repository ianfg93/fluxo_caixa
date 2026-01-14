import { AuthService } from './auth'

// Callback para quando a sessão expirar
type SessionExpiredCallback = () => void
let onSessionExpiredCallback: SessionExpiredCallback | null = null

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

  /**
   * Define o callback a ser chamado quando a sessão expirar (401)
   */
  static setOnSessionExpired(callback: SessionExpiredCallback) {
    onSessionExpiredCallback = callback
  }

  /**
   * Verifica se a resposta é 401 e dispara o callback de sessão expirada
   */
  private static async handleResponse(response: Response): Promise<Response> {
    if (response.status === 401) {
      // Sessão expirada no servidor
      if (onSessionExpiredCallback) {
        onSessionExpiredCallback()
      }
    }
    return response
  }

  static async get(url: string): Promise<Response> {
    try {
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      })
      return this.handleResponse(response)
    } catch (error) {
      console.error('API GET error:', error)
      throw error
    }
  }

  static async post(url: string, data: any): Promise<Response> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      })
      return this.handleResponse(response)
    } catch (error) {
      console.error('API POST error:', error)
      throw error
    }
  }

  static async put(url: string, data: any): Promise<Response> {
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      })
      return this.handleResponse(response)
    } catch (error) {
      console.error('API PUT error:', error)
      throw error
    }
  }

  static async patch(url: string, data?: any): Promise<Response> {
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      })
      return this.handleResponse(response)
    } catch (error) {
      console.error('API PATCH error:', error)
      throw error
    }
  }

  static async delete(url: string, data?: any): Promise<Response> {
    try {
      const response = await fetch(url, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      })
      return this.handleResponse(response)
    } catch (error) {
      console.error('API DELETE error:', error)
      throw error
    }
  }
}