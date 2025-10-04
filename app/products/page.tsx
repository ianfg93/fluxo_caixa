"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Package } from "lucide-react"
import { ProductService, type Product } from "@/lib/products"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({ name: "", quantity: "0" })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { authState } = useAuth()

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    const data = await ProductService.getProducts()
    setProducts(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (editingProduct) {
        await ProductService.updateProduct(editingProduct.id, {
          name: formData.name,
          quantity: parseInt(formData.quantity),
        })
      } else {
        await ProductService.addProduct({
          name: formData.name,
          quantity: parseInt(formData.quantity),
        })
      }

      setFormData({ name: "", quantity: "0" })
      setShowForm(false)
      setEditingProduct(null)
      loadProducts()
    } catch (error) {
      console.error("Error saving product:", error)
      alert("Erro ao salvar produto")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      quantity: product.quantity.toString(),
    })
    setShowForm(true)
  }

  const handleDelete = async (product: Product) => {
    if (!confirm(`Tem certeza que deseja excluir o produto "${product.name}"?`)) {
      return
    }

    const success = await ProductService.deleteProduct(product.id)
    if (success) {
      loadProducts()
    } else {
      alert("Erro ao excluir produto")
    }
  }

  const handleCancel = () => {
    setFormData({ name: "", quantity: "0" })
    setShowForm(false)
    setEditingProduct(null)
  }

  // Verificar permissão
  if (authState.user?.role !== 'master' && authState.user?.role !== 'administrator') {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
      <AuthenticatedLayout>
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold">Gerenciamento de Estoque</h1>
                <p className="text-muted-foreground">Controle seus produtos e quantidades</p>
              </div>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            )}
          </div>

          {showForm && (
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingProduct ? "Editar Produto" : "Novo Produto"}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Produto</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Produto A"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantidade</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="0"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Salvando..." : "Salvar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancel}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Carregando produtos...</p>
              </CardContent>
            </Card>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <p className="text-muted-foreground mb-4">Nenhum produto cadastrado</p>
                  {!showForm && (
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeiro Produto
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-mono text-muted-foreground">#{product.code}</span>
                          <h3 className="font-semibold text-lg">{product.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Quantidade em estoque: <span className="font-semibold">{product.quantity}</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(product)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(product)}
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
      </AuthenticatedLayout>
  )
}