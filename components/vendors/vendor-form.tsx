"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { VendorsService, type Vendor } from "@/lib/vendors"
import { Search, Loader2 } from "lucide-react"

interface VendorFormProps {
  vendor?: Vendor
  onSuccess: () => void
  onCancel: () => void
}

export function VendorForm({ vendor, onSuccess, onCancel }: VendorFormProps) {
  const [formData, setFormData] = useState({
    cnpj: vendor?.cnpj || "",
    name: vendor?.name || "",
    email: vendor?.email || "",
    address: vendor?.address || "",
    phone: vendor?.phone || "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingCNPJ, setIsFetchingCNPJ] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCNPJBlur = async () => {
    // Não buscar se for edição (CNPJ não pode ser alterado)
    if (vendor) return
    
    const cleanCNPJ = formData.cnpj.replace(/\D/g, "")
    
    if (cleanCNPJ.length !== 14) return

    setIsFetchingCNPJ(true)
    setError(null)

    try {
      const data = await VendorsService.fetchCNPJData(cleanCNPJ)
      
      if (data) {
        // Construir endereço completo
        const addressParts = [
          data.logradouro,
          data.numero,
          data.complemento,
          data.bairro,
          data.municipio,
          data.uf,
          data.cep
        ].filter(Boolean)
        
        setFormData(prev => ({
          ...prev,
          name: data.nome_fantasia || data.razao_social,
          email: data.email || prev.email,
          address: addressParts.join(", "),
          phone: data.telefone || prev.phone,
        }))
      } else {
        setError("CNPJ não encontrado na base de dados")
      }
    } catch (error) {
      setError("Erro ao buscar dados do CNPJ")
    } finally {
      setIsFetchingCNPJ(false)
    }
  }

  const handleCNPJChange = (value: string) => {
    // Permitir apenas números
    const cleaned = value.replace(/\D/g, "")
    
    // Limitar a 14 dígitos
    if (cleaned.length <= 14) {
      setFormData(prev => ({ ...prev, cnpj: cleaned }))
    }
  }

  const formatCNPJDisplay = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length <= 14) {
      return VendorsService.formatCNPJ(cleaned)
    }
    return value
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      if (vendor) {
        // Edição - não envia CNPJ
        await VendorsService.updateVendor(vendor.id, {
          name: formData.name,
          email: formData.email || null,
          address: formData.address || null,
          phone: formData.phone || null,
        })
      } else {
        // Criação - valida CNPJ
        const cleanCNPJ = formData.cnpj.replace(/\D/g, "")
        
        if (cleanCNPJ.length !== 14) {
          setError("CNPJ inválido. Deve conter 14 dígitos.")
          setIsSubmitting(false)
          return
        }

        await VendorsService.addVendor({
          cnpj: cleanCNPJ,
          name: formData.name,
          email: formData.email || null,
          address: formData.address || null,
          phone: formData.phone || null,
        })
      }

      onSuccess()
    } catch (error: any) {
      setError(error.message || "Erro ao salvar fornecedor")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{vendor ? "Editar Fornecedor" : "Novo Fornecedor"}</CardTitle>
        <CardDescription>
          {vendor ? "Atualize os dados do fornecedor" : "Cadastre um novo fornecedor"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* CNPJ - somente na criação */}
          {!vendor && (
            <div className="space-y-2">
              <Label htmlFor="cnpj">
                CNPJ *
                {isFetchingCNPJ && (
                  <span className="ml-2 text-blue-600 text-xs">
                    Buscando dados...
                  </span>
                )}
              </Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="cnpj"
                    value={formatCNPJDisplay(formData.cnpj)}
                    onChange={(e) => handleCNPJChange(e.target.value)}
                    onBlur={handleCNPJBlur}
                    placeholder="00.000.000/0000-00"
                    required
                    maxLength={18}
                    disabled={isFetchingCNPJ}
                  />
                </div>
                {isFetchingCNPJ && (
                  <Button type="button" size="icon" variant="outline" disabled>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Os dados serão preenchidos automaticamente ao informar um CNPJ válido
              </p>
            </div>
          )}

          {/* CNPJ readonly na edição */}
          {vendor && (
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={formatCNPJDisplay(vendor.cnpj)}
                disabled
                className="bg-slate-100"
              />
              <p className="text-xs text-muted-foreground">
                O CNPJ não pode ser alterado
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nome / Razão Social *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do fornecedor"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="contato@fornecedor.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 0000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isSubmitting || isFetchingCNPJ}>
              {isSubmitting ? "Salvando..." : vendor ? "Salvar Alterações" : "Cadastrar Fornecedor"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}