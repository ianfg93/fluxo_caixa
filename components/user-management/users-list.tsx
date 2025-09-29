"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Edit, Trash2, Search, UserPlus, Building2 } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import type { User } from "@/lib/user-management"

interface UsersListProps {
  users: User[]
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onAdd: () => void
  onRefresh: () => void
}

export function UsersList({ users, onEdit, onDelete, onAdd, onRefresh }: UsersListProps) {
  const { authState } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [companyFilter, setCompanyFilter] = useState<string>("all")

  const isMasterUser = authState.user?.role === 'master'

  // Lista única de empresas para o filtro (apenas para master)
  const companies = useMemo(() => {
    if (!isMasterUser) return []
    
    const uniqueCompanies = Array.from(
      new Set(
        users
          .map(user => user.companyName)
          .filter((companyName): companyName is string => typeof companyName === "string" && companyName.length > 0)
      )
    ).sort()
    return uniqueCompanies
  }, [users, isMasterUser])

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesStatus = statusFilter === "all" || user.status === statusFilter
    const matchesCompany = companyFilter === "all" || user.companyName === companyFilter

    return matchesSearch && matchesRole && matchesStatus && matchesCompany
  })

  const getRoleBadgeColor = (role: User["role"]) => {
    switch (role) {
      case "master":
        return "bg-red-100 text-red-800"
      case "administrator":
        return "bg-blue-100 text-blue-800"
      case "operational":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusBadgeColor = (status: User["status"]) => {
    return status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
  }

  const getRoleLabel = (role: User["role"]) => {
    switch (role) {
      case "master":
        return "Master"
      case "administrator":
        return "Administrador"
      case "operational":
        return "Operacional"
      default:
        return role
    }
  }

  const getStatusLabel = (status: User["status"]) => {
    return status === "active" ? "Ativo" : "Inativo"
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Usuários do Sistema</CardTitle>
            <CardDescription>Gerencie os usuários e suas permissões</CardDescription>
          </div>
          <Button onClick={onAdd}>
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Usuário
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className={`grid gap-4 lg:w-auto ${isMasterUser ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filtrar por nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os níveis</SelectItem>
                <SelectItem value="operational">Operacional</SelectItem>
                <SelectItem value="administrator">Administrador</SelectItem>
                <SelectItem value="master">Master</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Filtro de empresa - apenas para master */}
            {isMasterUser && companies.length > 0 && (
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Filtrar por empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Stats */}
        {(searchTerm || roleFilter !== "all" || statusFilter !== "all" || (isMasterUser && companyFilter !== "all")) && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Exibindo <span className="font-medium">{filteredUsers.length}</span> de{" "}
              <span className="font-medium">{users.length}</span> usuários
              {isMasterUser && companyFilter !== "all" && (
                <span> • Empresa: <span className="font-medium">{companyFilter}</span></span>
              )}
            </p>
          </div>
        )}

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                {/* Coluna Empresa - apenas para master */}
                {isMasterUser && <TableHead>Empresa</TableHead>}
                <TableHead>Nível</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead>Último Login</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isMasterUser ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    {searchTerm || roleFilter !== "all" || statusFilter !== "all" || (isMasterUser && companyFilter !== "all")
                      ? "Nenhum usuário encontrado com os filtros aplicados"
                      : "Nenhum usuário encontrado"
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    {/* Célula Empresa - apenas para master */}
                    {isMasterUser && (
                      <TableCell>
                        {user.companyName ? (
                          <div className="flex items-center gap-2">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{user.companyName}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge className={getRoleBadgeColor(user.role)}>{getRoleLabel(user.role)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(user.status)}>{getStatusLabel(user.status)}</Badge>
                    </TableCell>
                    <TableCell>{user.createdAt.toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{user.lastLogin ? user.lastLogin.toLocaleDateString("pt-BR") : "Nunca"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => onEdit(user)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(user)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}