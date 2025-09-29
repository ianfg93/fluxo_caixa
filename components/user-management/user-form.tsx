"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserManagementService, type User, type UserType, type Company, type CreateUserData, type UpdateUserData } from "@/lib/user-management"
import { useAuth } from "@/hooks/use-auth"

interface UserFormProps {
  user?: User
  onSuccess: () => void
  onCancel: () => void
}

export function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const { authState } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [availableUserTypes, setAvailableUserTypes] = useState<UserType[]>([])
  
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    role: user?.role || ("operational" as const),
    company_id: user?.company_id || "",
    password: "",
    confirmPassword: "",
    status: user?.status || ("active" as const),
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Carregar empresas e tipos de usuário disponíveis
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Buscar tipos de usuário disponíveis baseado no usuário logado
        const userTypes = await UserManagementService.getAvailableUserTypes()
        setAvailableUserTypes(userTypes)

        // Se o usuário é master, buscar todas as empresas
        if (authState.user?.role === 'master') {
          const companiesData = await UserManagementService.getAllCompanies()
          setCompanies(companiesData)
        }
        // Se não for master, usar apenas a empresa do usuário logado
        else if (authState.user?.companyId) {
          const companyData = await UserManagementService.getCompanyById(authState.user.companyId)
          setCompanies([companyData])
          setFormData(prev => ({ ...prev, company_id: authState.user?.companyId || "" }))
        }
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error)
      }
    }

    loadInitialData()
  }, [authState.user])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Nome é obrigatório"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido"
    }

    if (!formData.role) {
      newErrors.role = "Tipo de usuário é obrigatório"
    }

    if (authState.user?.role === 'master' && !formData.company_id.trim()) {
      newErrors.company_id = "Empresa é obrigatória"
    }

    if (!user && !formData.password) {
      newErrors.password = "Senha é obrigatória"
    }

    if (!user && formData.password && formData.password.length < 6) {
      newErrors.password = "Senha deve ter pelo menos 6 caracteres"
    }

    if (!user && formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Senhas não coincidem"
    }

    // Validação de permissões
    if (formData.role === 'master' && authState.user?.role !== 'master') {
      newErrors.role = "Apenas usuários master podem criar outros usuários master"
    }

    // Administradores podem criar administrator e operational, mas não master

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      if (user) {
        // Update existing user
        const updateData: UpdateUserData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          status: formData.status,
          ...(authState.user?.role === 'master' && formData.company_id && { company_id: formData.company_id })
        }
        await UserManagementService.updateUser(user.id, updateData)
      } else {
        // Create new user
        const createData: CreateUserData = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
          password: formData.password,
          ...(authState.user?.role === 'master' && formData.company_id && { company_id: formData.company_id })
        }
        await UserManagementService.createUser(createData)
      }

      onSuccess()
    } catch (error: any) {
      console.error("Error saving user:", error)
      setErrors({ submit: error.message || "Erro ao salvar usuário. Tente novamente." })
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      'master': 'Master',
      'administrator': 'Administrador', 
      'operational': 'Operacional'
    }
    return labels[role as keyof typeof labels] || role
  }

  const getAvailableRoles = () => {
    return availableUserTypes.map(userType => {
      const role = UserManagementService.mapUserTypeToRole(userType.name)
      return {
        value: role,
        label: getRoleLabel(role)
      }
    })
  }

  const isMasterUser = authState.user?.role === 'master'
  const showCompanyField = isMasterUser && companies.length > 0

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{user ? "Editar Usuário" : "Novo Usuário"}</CardTitle>
        <CardDescription>
          {user ? "Atualize as informações do usuário" : "Crie um novo usuário no sistema"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Digite o nome completo"
                required
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="usuario@empresa.com"
                required
              />
              {errors.email && <p className="text-sm text-red-600">{errors.email}</p>}
            </div>
          </div>

          <div className={`grid grid-cols-1 ${showCompanyField ? 'md:grid-cols-2' : ''} gap-4`}>
            <div className="space-y-2">
              <Label htmlFor="role">Nível de Acesso</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as any })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableRoles().map((roleOption) => (
                    <SelectItem key={roleOption.value} value={roleOption.value}>
                      {roleOption.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.role && <p className="text-sm text-red-600">{errors.role}</p>}
            </div>

            {/* Campo de empresa - só aparece para usuário master */}
            {showCompanyField && (
              <div className="space-y-2">
                <Label htmlFor="company_id">Empresa</Label>
                <Select
                  value={formData.company_id}
                  onValueChange={(value) => setFormData({ ...formData, company_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.company_id && <p className="text-sm text-red-600">{errors.company_id}</p>}
              </div>
            )}

            {/* Campo de status - só aparece ao editar usuário */}
            {user && (
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Campos de senha - só aparecem ao criar novo usuário */}
          {!user && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Digite a senha (mín. 6 caracteres)"
                  required
                />
                {errors.password && <p className="text-sm text-red-600">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirme a senha"
                  required
                />
                {errors.confirmPassword && <p className="text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? "Salvando..." : user ? "Atualizar Usuário" : "Criar Usuário"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}