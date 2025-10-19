"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Trash2, Package, PackagePlus, Search, X, AlertTriangle, DollarSign } from "lucide-react"
import { ProductService, type Product } from "@/lib/products"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showAddStockForm, setShowAddStockForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [addingStockProduct, setAddingStockProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({ name: "", quantity: "0", price: "0.00", barcode: "" })
  const [addStockQuantity, setAddStockQuantity] = useState("0")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { authState } = useAuth()

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState<"code" | "name" | "quantity-asc" | "quantity-desc" | "price-asc" | "price-desc">("code")
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false)
  const [showOnlyOutOfStock, setShowOnlyOutOfStock] = useState(false)
  const [lowStockThreshold, setLowStockThreshold] = useState(5)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setLoading(true)
    const data = await ProductService.getProducts()
    setProducts(data)
    setLoading(false)
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const price = parseFloat(formData.price)
      
      if (price < 0) {
        alert("O preço não pode ser negativo")
        setIsSubmitting(false)
        return
      }

      if (editingProduct) {
        await ProductService.updateProduct(editingProduct.id, {
          name: formData.name,
          quantity: parseInt(formData.quantity),
          price: price,
          barcode: formData.barcode || undefined,
        })
      } else {
        await ProductService.addProduct({
          name: formData.name,
          quantity: parseInt(formData.quantity),
          price: price,
          barcode: formData.barcode || undefined,
        })
      }

      setFormData({ name: "", quantity: "0", price: "0.00", barcode: "" })
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
    setShowForm(false)
    setEditingProduct(null)
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
    setShowAddStockForm(false)
    setEditingProduct(product)
    setFormData({
      name: product.name,
      quantity: product.quantity.toString(),
      price: (Number(product.price) || 0).toFixed(2),
      barcode: product.barcode || "",
    })
    setShowForm(false)
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
    setFormData({ name: "", quantity: "0", price: "0.00", barcode: "" })
    setShowForm(false)
    setEditingProduct(null)
  }

  const handleCancelAddStock = () => {
    setAddStockQuantity("0")
    setShowAddStockForm(false)
    setAddingStockProduct(null)
  }

  const getFilteredAndSortedProducts = () => {
  let filtered = [...products]

  console.log('========== DEBUG FILTRO ==========')
  console.log('Total de produtos:', products.length)
  console.log('Produtos com barcode:', products.map(p => ({ 
    codigo: p.code,
    nome: p.name, 
    barcode: p.barcode || 'SEM BARCODE'
  })))

  // Filtro de busca por nome
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase()
    console.log('>>> Termo buscado:', searchLower)
    
    filtered = filtered.filter(product => {
      const matchName = product.name.toLowerCase().includes(searchLower)
      const matchCode = product.code.toString().includes(searchLower)
      const matchBarcode = product.barcode && product.barcode.toLowerCase().includes(searchLower)
      
      console.log(`Produto ${product.name}:`, {
        matchName,
        matchCode, 
        matchBarcode,
        barcode: product.barcode
      })
      
      return matchName || matchCode || matchBarcode
    })
    
    console.log('>>> Produtos encontrados:', filtered.length)
  }

  // Filtro de estoque baixo
  if (showOnlyLowStock) {
    filtered = filtered.filter(product => 
      product.quantity > 0 && product.quantity <= lowStockThreshold
    )
  }

  // Filtro de produtos sem estoque
  if (showOnlyOutOfStock) {
    filtered = filtered.filter(product => product.quantity === 0)
  }

  // Ordenação
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "code":
        return a.code - b.code
      case "name":
        return a.name.localeCompare(b.name)
      case "quantity-asc":
        return a.quantity - b.quantity
      case "quantity-desc":
        return b.quantity - a.quantity
      case "price-asc":
        return a.price - b.price
      case "price-desc":
        return b.price - a.price
      default:
        return 0
    }
  })

  console.log('========== FIM DEBUG ==========')
  return filtered
}

  const filteredProducts = getFilteredAndSortedProducts()

  const clearFilters = () => {
    setSearchTerm("")
    setSortBy("code")
    setShowOnlyLowStock(false)
    setShowOnlyOutOfStock(false)
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
              <p className="text-muted-foreground">Controle seus produtos, quantidades e preços</p>
            </div>
          </div>
          {!showForm && !showAddStockForm && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          )}
        </div>

        {showForm && !editingProduct && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Novo Produto</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Produto *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Produto A"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="barcode">Código de Barras</Label>
                    <Input
                      id="barcode"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="Ex: 7891234567890"
                      maxLength={50}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="price">Preço Unitário (R$) *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price}
                        onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        placeholder="0,00"
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade Inicial *</Label>
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

        {/* Barra de Filtros */}
        {!loading && products.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Filtros e Ordenação
                  </h3>
                  {(searchTerm || sortBy !== "code" || showOnlyLowStock || showOnlyOutOfStock) && (
                    <Button size="sm" variant="ghost" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-1" />
                      Limpar Filtros
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Busca por nome */}
                  <div className="space-y-2">
                    <Label htmlFor="search">Buscar Produto</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        type="text"
                        placeholder="Digite o nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Ordenação */}
                  <div className="space-y-2">
                    <Label htmlFor="sort">Ordenar Por</Label>
                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger id="sort">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="code">Código (Padrão)</SelectItem>
                        <SelectItem value="name">Nome (A-Z)</SelectItem>
                        <SelectItem value="quantity-asc">Menor Estoque</SelectItem>
                        <SelectItem value="quantity-desc">Maior Estoque</SelectItem>
                        <SelectItem value="price-asc">Menor Preço</SelectItem>
                        <SelectItem value="price-desc">Maior Preço</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Estoque crítico */}
                  <div className="space-y-2">
                    <Label>Filtros Rápidos</Label>
                    <div className="flex items-center space-x-2 h-10">
                      <Checkbox
                        id="lowStock"
                        checked={showOnlyLowStock}
                        onCheckedChange={(checked) => {
                          setShowOnlyLowStock(checked as boolean)
                          if (checked) setShowOnlyOutOfStock(false)
                        }}
                      />
                      <label
                        htmlFor="lowStock"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Estoque Baixo (≤{lowStockThreshold})
                      </label>
                    </div>
                  </div>

                  {/* Sem estoque */}
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <div className="flex items-center space-x-2 h-10">
                      <Checkbox
                        id="outOfStock"
                        checked={showOnlyOutOfStock}
                        onCheckedChange={(checked) => {
                          setShowOnlyOutOfStock(checked as boolean)
                          if (checked) setShowOnlyLowStock(false)
                        }}
                      />
                      <label
                        htmlFor="outOfStock"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Sem Estoque (0)
                      </label>
                    </div>
                  </div>
                </div>

                {/* Contador */}
                <div className="text-sm text-muted-foreground border-t pt-3">
                  Exibindo <strong>{filteredProducts.length}</strong> de <strong>{products.length}</strong> produtos
                </div>
              </div>
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
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-2">Nenhum produto encontrado com os filtros aplicados</p>
                <Button size="sm" variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.quantity === 0
              const isLowStock = product.quantity > 0 && product.quantity <= lowStockThreshold
              const isEditing = editingProduct?.id === product.id
              const isAddingStock = addingStockProduct?.id === product.id
              
              return (
                <Card 
                  key={product.id}
                  className={
                    isOutOfStock 
                      ? "border-red-300 bg-red-50" 
                      : isLowStock 
                      ? "border-yellow-300 bg-yellow-50" 
                      : isEditing
                      ? "border-blue-300 bg-blue-50"
                      : isAddingStock
                      ? "border-green-300 bg-green-50"
                      : ""
                  }
                >
                  <CardContent className="p-6">
                    {isEditing ? (
                      // Formulário de edição inline
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Editar Produto</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-name">Nome do Produto *</Label>
                              <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Ex: Produto A"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-barcode">Código de Barras</Label>
                              <Input
                                id="edit-barcode"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                placeholder="Ex: 7891234567890"
                                maxLength={50}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="edit-price">Preço Unitário (R$) *</Label>
                              <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  id="edit-price"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={formData.price}
                                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                  placeholder="0,00"
                                  className="pl-10"
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="edit-quantity">Quantidade *</Label>
                              <Input
                                id="edit-quantity"
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
                              {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                            <Button type="button" variant="outline" onClick={handleCancel}>
                              Cancelar
                            </Button>
                          </div>
                        </form>
                      </div>
                    ) : isAddingStock ? (
                      // Formulário de adicionar estoque inline
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Adicionar Estoque</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Produto: <strong>{product.name}</strong> | 
                          Estoque atual: <strong>{product.quantity}</strong> | 
                          Preço: <strong>{formatCurrency(product.price)}</strong>
                        </p>
                        <form onSubmit={handleAddStockSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor={`addQuantity-${product.id}`}>Quantidade a Adicionar</Label>
                            <Input
                              id={`addQuantity-${product.id}`}
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
                                Novo estoque será: <strong>{product.quantity + parseInt(addStockQuantity)}</strong>
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
                      </div>
                    ) : (
                      // Conteúdo normal do card
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-sm font-mono text-muted-foreground">#{product.code}</span>
                            <h3 className="font-semibold text-lg">{product.name}</h3>
                            {isOutOfStock && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-red-600 text-white">
                                <AlertTriangle className="h-3 w-3" />
                                SEM ESTOQUE
                              </span>
                            )}
                            {isLowStock && (
                              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-yellow-600 text-white">
                                <AlertTriangle className="h-3 w-3" />
                                ESTOQUE BAIXO
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-sm text-muted-foreground">
                              Quantidade em estoque: 
                              <span 
                                className={`font-semibold ml-1 ${
                                  isOutOfStock ? "text-red-700" : isLowStock ? "text-yellow-700" : ""
                                }`}
                              >
                                {product.quantity}
                              </span>
                            </p>
                            <span className="text-muted-foreground">|</span>
                            <p className="text-sm">
                              Preço unitário: 
                              <span className="font-semibold text-green-600 ml-1">
                                {formatCurrency(product.price)}
                              </span>
                            </p>
                            {product.barcode && (
                              <>
                                <span className="text-muted-foreground">|</span>
                                <p className="text-sm text-muted-foreground">
                                  Cód. Barras: <span className="font-mono font-semibold">{product.barcode}</span>
                                </p>
                              </>
                            )}
                          </div>
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
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  )
}