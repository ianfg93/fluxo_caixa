"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Search, Building, Mail, Phone, MapPin } from "lucide-react"
import { VendorsService, type Vendor } from "@/lib/vendors"

interface VendorsListProps {
  vendors: Vendor[]
  onEdit: (vendor: Vendor) => void
  onDelete: (vendor: Vendor) => void
  onAdd: () => void
  onRefresh: () => void
}

export function VendorsList({ vendors, onEdit, onDelete, onAdd, onRefresh }: VendorsListProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.cnpj.includes(searchTerm.replace(/\D/g, ""))
  )

  const formatCNPJ = (cnpj: string) => {
    return VendorsService.formatCNPJ(cnpj)
  }

  return (
    <div className="space-y-6">
      {/* Header com busca */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 w-full sm:max-w-sm space-y-2">
              <Label htmlFor="search">Buscar Fornecedor</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Nome ou CNPJ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={onRefresh}>
                Atualizar
              </Button>
              <Button onClick={onAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Fornecedor
              </Button>
            </div>
          </div>

          {filteredVendors.length !== vendors.length && (
            <div className="mt-4 text-sm text-muted-foreground">
              Exibindo <strong>{filteredVendors.length}</strong> de <strong>{vendors.length}</strong> fornecedores
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de fornecedores */}
      {filteredVendors.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {vendors.length === 0 
                  ? "Nenhum fornecedor cadastrado"
                  : "Nenhum fornecedor encontrado com os filtros aplicados"
                }
              </p>
              {vendors.length === 0 && (
                <Button onClick={onAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeiro Fornecedor
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-lg">{vendor.name}</h3>
                        <span className="text-sm font-mono text-muted-foreground bg-slate-100 px-2 py-1 rounded">
                          {formatCNPJ(vendor.cnpj)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {vendor.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{vendor.email}</span>
                        </div>
                      )}
                      
                      {vendor.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{vendor.phone}</span>
                        </div>
                      )}
                      
                      {vendor.address && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span className="line-clamp-1">{vendor.address}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => onEdit(vendor)}
                      title="Editar fornecedor"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onDelete(vendor)}
                      title="Excluir fornecedor"
                      className="hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}