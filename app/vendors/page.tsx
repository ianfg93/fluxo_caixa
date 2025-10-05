"use client"

import { useState, useEffect } from "react"
import { VendorsList } from "@/components/vendors/vendors-list"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { VendorsService, type Vendor } from "@/lib/vendors"
import { useAuth } from "@/hooks/use-auth"
import { Building2 } from "lucide-react"
import { VendorForm } from "@/components/vendors/vendor-form"

export default function VendorsPage() {
  const { hasPermission } = useAuth()
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)

  // Verificar permissão - master e administrator podem acessar
  if (!hasPermission('administrator') && !hasPermission('master')) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Acesso Restrito</h2>
            <p className="text-muted-foreground">Apenas administradores podem gerenciar fornecedores.</p>
          </div>
        </div>
      </AuthenticatedLayout>
    )
  }

  const loadVendors = async () => {
    setLoading(true)
    const data = await VendorsService.getVendors()
    setVendors(data)
    setLoading(false)
  }

  const handleAdd = () => {
    setEditingVendor(null)
    setShowForm(true)
  }

  const handleEdit = (vendor: Vendor) => {
    setEditingVendor(vendor)
    setShowForm(true)
  }

  const handleDelete = async (vendor: Vendor) => {
    if (confirm(`Tem certeza que deseja excluir o fornecedor ${vendor.name}?`)) {
      const success = await VendorsService.deleteVendor(vendor.id)
      if (success) {
        await loadVendors()
      } else {
        alert("Erro ao excluir fornecedor. Pode haver contas a pagar vinculadas.")
      }
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingVendor(null)
    loadVendors()
  }

  const handleFormCancel = () => {
    setShowForm(false)
    setEditingVendor(null)
  }

  useEffect(() => {
    loadVendors()
  }, [])

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Fornecedores</h1>
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
        <VendorForm
          vendor={editingVendor ?? undefined}
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
          <h1 className="text-3xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerencie seus fornecedores e suas informações
          </p>
        </div>
        
        <VendorsList
          vendors={vendors}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={handleAdd}
          onRefresh={loadVendors}
        />
      </div>
    </AuthenticatedLayout>
  )
}