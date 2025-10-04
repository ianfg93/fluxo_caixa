"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Package, PackagePlus } from "lucide-react"
import { ProductService, type Product } from "@/lib/products"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAddStockForm, setShowAddStockForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [addingStockProduct, setAddingStockProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({ name: "", quantity: "0" })
  const [addStockQuantity, setAddStockQuantity] = useState("0")
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

  const handleAddStock = (product: Product) => {
    setAddingStockProduct(product)
    setAddStockQuantity("0")
    setShowAddStockForm(true)
    setShowForm(false)
  }

  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addingStockProduct) return

    const quantityToAdd = parseInt(addStockQuantity)
    
    if (quantityToAdd <= 0) {
      alert("A quantidade deve ser maior que zero")
      return
    }

    setIsSubmitting(true)

    try {
      const newQuantity = addingStockProduct.quantity + quantityToAdd

      await ProductService.updateProduct(addingStockProduct.id, {
        quantity: newQuantity,
      })

      setAddStockQuantity("0")
      setShowAddStockForm(false)
      setAddingStockProduct(null)
      loadProducts()
    } catch (error) {
      console.error("Error adding stock:", error)
      alert("Erro ao adicionar estoque")
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
    setShowAddStockForm(false)
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

  const handleCancelAddStock = () => {
    setAddStockQuantity("0")
    setShowAddStockForm(false)
    setAddingStockProduct(null)
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
          {!showForm && !showAddStockForm && (
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

        {showAddStockForm && addingStockProduct && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Adicionar Estoque</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Produto: <strong>{addingStockProduct.name}</strong> | 
                Estoque atual: <strong>{addingStockProduct.quantity}</strong>
              </p>
              <form onSubmit={handleAddStockSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="addQuantity">Quantidade a Adicionar</Label>
                  <Input
                    id="addQuantity"
                    type="number"
                    min="1"
                    value={addStockQuantity}
                    onChange={(e) => setAddStockQuantity(e.target.value)}
                    placeholder="Digite a quantidade"
                    required
                    autoFocus
                  />
                  {parseInt(addStockQuantity) > 0 && (
                    <p className="text-sm text-green-700">
                      Novo estoque será: <strong>{addingStockProduct.quantity + parseInt(addStockQuantity)}</strong>
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Adicionando..." : "Confirmar Adição"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancelAddStock}>
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
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleAddStock(product)}
                        className="hover:bg-green-50 hover:text-green-600 hover:border-green-300"
                        title="Adicionar estoque"
                      >
                        <PackagePlus className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleEdit(product)}
                        title="Editar produto"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(product)}
                        className="hover:bg-red-50 hover:text-red-600"
                        title="Excluir produto"
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