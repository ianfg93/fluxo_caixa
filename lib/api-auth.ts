import { type NextRequest } from "next/server"
import jwt from 'jsonwebtoken'
import { query } from "./database"

export interface ApiUser {
  id: string
  email: string
  name: string
  role: 'master' | 'administrator' | 'operational'
  userLevel: number
  companyId: string | null
  companyName: string | null
  permissions: Record<string, any>
}

export class ApiAuthService {
  static async authenticateRequest(request: NextRequest): Promise<ApiUser | null> {
    try {
      const authHeader = request.headers.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return null
      }

      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_jwt_secret_aqui') as any

      const result = await query(`
        SELECT 
          u.id,
          u.email,
          u.name,
          u.active,
          u.company_id,
          ut.name as user_type,
          ut.level as user_level,
          ut.permissions,
          c.name as company_name,
          c.active as company_active
        FROM users u
        INNER JOIN user_types ut ON u.user_type_id = ut.id
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.id = $1 AND u.active = true
      `, [decoded.userId])

      if (result.rows.length === 0) {
        return null
      }

      const userData = result.rows[0]

      if (userData.user_type !== 'master' && !userData.company_active) {
        return null
      }

      return {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.user_type,
        userLevel: userData.user_level,
        companyId: userData.company_id,
        companyName: userData.company_name,
        permissions: userData.permissions || {}
      }

    } catch (error) {
      console.error('Erro na autenticação da API:', error)
      return null
    }
  }

  static hasPermission(user: ApiUser, action: string): boolean {
    if (user.role === 'master') {
      return true
    }

    // Verificar permissões do banco de dados primeiro
    if (user.permissions) {
      switch (action) {
        case 'manage_company':
          return user.permissions.can_manage_company === true
        case 'create_users':
          return user.permissions.can_create_users === true
        case 'manage_all':
          return user.permissions.can_manage_all_companies === true
        case 'create_company':
          return user.permissions.can_create_companies === true
        default:
          break
      }
    }

    // Fallback para permissões hardcoded (corrigidas)
    const permissions = {
      administrator: [
        'manage_company', 'create_users', 'delete_records', 'edit_all', 
        'create_entries', 'view_company'
      ],
      operational: ['create_entries', 'edit_own', 'view_company']
    }

    return permissions[user.role]?.includes(action) || false
  }

  static addCompanyFilter(baseQuery: string, user: ApiUser, companyParam?: string): { query: string, params: string[] } {
    if (user.role === 'master' && !companyParam) {
      return { query: baseQuery, params: [] }
    }

    const targetCompanyId = companyParam || user.companyId
    
    if (!targetCompanyId) {
      throw new Error('ID da empresa não especificado')
    }

    const whereClause = baseQuery.toLowerCase().includes('where') ? 'AND' : 'WHERE'
    const query = `${baseQuery} ${whereClause} company_id = $COMPANY_FILTER$`
    
    return { query, params: [targetCompanyId] }
  }
}