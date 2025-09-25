import { type NextRequest } from "next/server"
import { query } from "@/lib/database"

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  role: 'master' | 'administrator' | 'operational'
  userLevel: number
  companyId: string | null
  companyName: string | null
  permissions: Record<string, any>
}

export class AuthMiddleware {
  // Verificar se usuário tem permissão para ação
  static hasPermission(user: AuthenticatedUser, action: string): boolean {
    const rolePermissions = {
      master: ['create_company', 'manage_all', 'delete_all', 'view_all_companies'],
      administrator: ['manage_company', 'create_users', 'delete_records', 'edit_all'],
      operational: ['create_entries', 'edit_own', 'view_company']
    }

    return rolePermissions[user.role]?.includes(action) || false
  }

  // Adicionar filtro automático de empresa nas queries
  static addCompanyFilter(baseQuery: string, user: AuthenticatedUser, tableAlias = ''): string {
    // Master pode ver tudo, não precisa filtro
    if (user.role === 'master') {
      return baseQuery
    }

    // Outros usuários só veem dados da sua empresa
    const prefix = tableAlias ? `${tableAlias}.` : ''
    const whereClause = baseQuery.toLowerCase().includes('where') ? 'AND' : 'WHERE'
    
    return `${baseQuery} ${whereClause} ${prefix}company_id = '${user.companyId}'`
  }

  // Verificar se usuário pode acessar dados de uma empresa específica
  static canAccessCompany(user: AuthenticatedUser, targetCompanyId: string): boolean {
    return user.role === 'master' || user.companyId === targetCompanyId
  }
}