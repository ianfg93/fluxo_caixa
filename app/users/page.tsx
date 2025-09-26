"use client"

import { useState, useEffect } from "react"
import { UsersList } from "@/components/user-management/users-list"
import { UserForm } from "@/components/user-management/user-form"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { UserManagementService, type User } from "@/lib/user-management"
import { useAuth } from "@/hooks/use-auth"
import { Building2 } from "lucide-react"

export default function UsersPage() {
  const { hasPermission } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)

  // Verificar permissão - master e administrator podem acessar
  if (!hasPermission('administrator') && !hasPermission('master')) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground">Apenas administradores podem gerenciar usuários.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  const loadUsers = async () => {
    setLoading(true)
    const data = await UserManagementService.getUsers()
    setUsers(data)
    setLoading(false)
  }

  const handleAdd = () => {
    setEditingUser(null)
    setShowForm(true)
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setShowForm(true)
  }

  const handleDelete = async (user: User) => {
    if (confirm(`Tem certeza que deseja excluir o usuário ${user.name}?`)) {
      const success = await UserManagementService.deleteUser(user.id)
      if (success) {
        await loadUsers()
      }
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingUser(null)
    loadUsers()
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingUser(null)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Usuários</h1>
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg mb-4"></div>
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (showForm) {
    return (
      <AuthenticatedLayout>
        <UserForm
          user={editingUser ?? undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie os usuários do sistema
          </p>
        </div>
        
        <UsersList
          users={users}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={handleAdd}
          onRefresh={loadUsers}
        />
      </div>
    </AuthenticatedLayout>
  )
}