"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { UserManagementService, type User } from "@/lib/user-management"
import { UserForm } from "@/components/user-management/user-form"
import { UsersList } from "@/components/user-management/users-list"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"

export default function UsersPage() {
  const { hasPermission } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const allUsers = await UserManagementService.getUsers()
      setUsers(allUsers)
    } catch (error) {
      console.error("Erro ao carregar usuários:", error)
    }
  }

  const handleAdd = () => {
    setSelectedUser(null)
    setShowForm(true)
  }

  const handleEdit = (user: User) => {
    setSelectedUser(user)
    setShowForm(true)
  }

  const handleDelete = (user: User) => {
    setUserToDelete(user)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (userToDelete) {
      try {
        await UserManagementService.deleteUser(userToDelete.id)
        loadUsers()
        setShowDeleteDialog(false)
        setUserToDelete(null)
      } catch (error) {
        console.error("Erro ao excluir usuário:", error)
        alert("Erro ao excluir usuário. Tente novamente.")
      }
    }
  }

  const handleFormSuccess = () => {
    loadUsers()
    setShowForm(false)
    setSelectedUser(null)
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setSelectedUser(null)
  }

  if (!hasPermission("master")) {
    return (
      <AuthenticatedLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para acessar o gerenciamento de usuários.
            </p>
          </CardContent>
        </Card>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciamento de Usuários</h1>
          <p className="text-muted-foreground">Gerencie usuários e suas permissões no sistema</p>
        </div>
        
        <UsersList 
          users={users} 
          onAdd={handleAdd} 
          onEdit={handleEdit} 
          onDelete={handleDelete} 
          onRefresh={loadUsers} 
        />
        
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-4xl">
            <UserForm 
              user={selectedUser ?? undefined} 
              onSuccess={handleFormSuccess} 
              onCancel={handleFormCancel} 
            />
          </DialogContent>
        </Dialog>
        
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Exclusão</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o usuário "{userToDelete?.name}"? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthenticatedLayout>
  )
}