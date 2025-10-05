"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CashFlowService, type PaymentMethod } from "@/lib/cash-flow"
import { ProductService, type Product } from "@/lib/products"
import { Textarea } from "../ui/textarea"
import { Plus, X, Package, Calculator, Search } from "lucide-react"

interface SelectedProduct {
  productId: string
  productName: string
  price: number
  quantity: number
  subtotal: number
  availableStock: number
}

interface EntryFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function EntryForm({ onSuccess, onCancel }: EntryFormProps) {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "" as PaymentMethod | "",
    notes: "",
    additionalNotes: "",
  })
  
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [productSearchTerm, setProductSearchTerm] = useState<string>("")
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [currentQuantity, setCurrentQuantity] = useState<string>("1")
  const [extraAmount, setExtraAmount] = useState<string>("0")
  
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paymentMethods = CashFlowService.getPaymentMethodOptions()

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setIsLoadingProducts(true)
    const data = await ProductService.getProducts()
    setProducts(data)
    setIsLoadingProducts(false)
  }

  // Filtrar produtos disponíveis com base na busca
  const filteredAvailableProducts = useMemo(() => {
    const searchLower = productSearchTerm.toLowerCase().trim()
    
    return products
      .filter((p) => p.quantity > 0)
      .filter((p) => {
        if (!searchLower) return true
        
        const matchesName = p.name.toLowerCase().includes(searchLower)
        const matchesCode = p.code.toString().includes(searchLower)
        
        return matchesName || matchesCode
      })
  }, [products, productSearchTerm])

  // Atualizar observações quando produtos selecionados mudam
  useEffect(() => {
    if (selectedProducts.length > 0) {
      const productList = selectedProducts
        .map((p) => `${p.productName} (Qtd: ${p.quantity} × ${formatCurrency(p.price)} = ${formatCurrency(p.subtotal)})`)
        .join(", ")
      setFormData((prev) => ({ ...prev, notes: `Produtos: ${productList}` }))
    } else {
      setFormData((prev) => ({ ...prev, notes: "" }))
    }
  }, [selectedProducts])

  const getProductsSubtotal = (): number => {
    return selectedProducts.reduce((sum, p) => sum + p.subtotal, 0)
  }

  const getTotalAmount = (): number => {
    const productsTotal = getProductsSubtotal()
    const extra = Number.parseFloat(extraAmount) || 0
    return productsTotal + extra
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId)
    setCurrentQuantity("1")
    setError(null)
  }

  const handleAddProduct = () => {
    if (!selectedProductId || !currentQuantity) {
      setError("Selecione um produto e informe a quantidade")
      return
    }

    const quantity = parseInt(currentQuantity)
    if (quantity <= 0) {
      setError("Quantidade deve ser maior que zero")
      return
    }

    if (selectedProducts.some((p) => p.productId === selectedProductId)) {
      setError("Este produto já foi adicionado")
      return
    }

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) {
      setError("Produto não encontrado")
      return
    }

    if (quantity > product.quantity) {
      setError(`Estoque insuficiente. Disponível: ${product.quantity}`)
      return
    }

    const subtotal = product.price * quantity

    setSelectedProducts([
      ...selectedProducts,
      {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity,
        subtotal,
        availableStock: product.quantity,
      },
    ])

    setSelectedProductId("")
    setCurrentQuantity("1")
    setProductSearchTerm("")
    setError(null)
  }

  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((p) => p.productId !== productId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const totalAmount = getTotalAmount()

      if (totalAmount <= 0) {
        setError("O valor total deve ser maior que zero")
        setIsLoading(false)
        return
      }

      const transactionData: any = {
        type: "entry",
        description: "Venda",
        amount: totalAmount,
        category: "vendas",
        date: new Date(formData.date),
        paymentMethod: formData.paymentMethod || undefined,
        notes: formData.notes || undefined,
      }

      if (formData.additionalNotes) {
        if (transactionData.notes) {
          transactionData.notes += `\n\nObservações: ${formData.additionalNotes}`
        } else {
          transactionData.notes = formData.additionalNotes
        }
      }

      const extra = Number.parseFloat(extraAmount) || 0
      if (extra > 0) {
        transactionData.notes = transactionData.notes 
          ? `${transactionData.notes}\n\nValor Extra: ${formatCurrency(extra)}`
          : `Valor Extra: ${formatCurrency(extra)}`
      }

      if (selectedProducts.length > 0) {
        transactionData.products = selectedProducts.map((p) => ({
          productId: p.productId,
          quantity: p.quantity,
        }))
      }

      const result = await CashFlowService.addTransaction(transactionData)

      if (!result) {
        setError("Erro ao salvar a entrada. Tente novamente.")
        return
      }

      onSuccess()
    } catch (error) {
      console.error("Error adding entry:", error)
      setError("Erro ao salvar a entrada. Verifique os dados e tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const selectedProduct = products.find(p => p.id === selectedProductId)

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Nova Entrada (Venda)</CardTitle>
        <CardDescription>Registre uma nova venda ou entrada de dinheiro</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Seção de Produtos */}
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Produtos da Venda</h3>
            </div>

            {/* Campo de Busca */}
            <div className="space-y-2">
              <Label htmlFor="productSearch">Buscar Produto</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="productSearch"
                  type="text"
                  placeholder="Digite o nome ou código do produto..."
                  value={productSearchTerm}
                  onChange={(e) => setProductSearchTerm(e.target.value)}
                  className="pl-10"
                  disabled={isLoadingProducts}
                />
                {productSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setProductSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Lista de Produtos Disponíveis */}
            {productSearchTerm && (
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md bg-white p-2">
                {isLoadingProducts ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                ) : filteredAvailableProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum produto encontrado
                  </p>
                ) : (
                  filteredAvailableProducts.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product.id)}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${
                        selectedProductId === product.id
                          ? "bg-blue-100 border-2 border-blue-500"
                          : "bg-slate-50 hover:bg-slate-100 border border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-muted-foreground">#{product.code}</span>
                            <p className="font-medium">{product.name}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span>Preço: <strong className="text-green-600">{formatCurrency(product.price)}</strong></span>
                            <span>•</span>
                            <span>Estoque: <strong>{product.quantity}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Produto Selecionado e Quantidade */}
            {selectedProduct && (
              <div className="space-y-3 p-3 bg-blue-50 border-2 border-blue-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-blue-900">Produto Selecionado:</p>
                    <p className="text-sm">#{selectedProduct.code} - {selectedProduct.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(selectedProduct.price)} • Estoque: {selectedProduct.quantity}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedProductId("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="quantity">Quantidade</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={selectedProduct.quantity}
                      value={currentQuantity}
                      onChange={(e) => setCurrentQuantity(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      onClick={handleAddProduct}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de Produtos Adicionados */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>Produtos Adicionados:</Label>
                <div className="space-y-2">
                  {selectedProducts.map((product) => (
                    <div
                      key={product.productId}
                      className="flex items-center justify-between p-3 bg-white border rounded-md"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{product.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {product.quantity} × {formatCurrency(product.price)} = <span className="font-semibold text-green-600">{formatCurrency(product.subtotal)}</span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveProduct(product.productId)}
                        className="hover:bg-red-50 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Resumo de Valores */}
          <div className="space-y-3 p-4 border rounded-lg bg-blue-50">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Resumo de Valores</h3>
            </div>

            {selectedProducts.length > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Subtotal dos Produtos:</span>
                <span className="font-semibold">{formatCurrency(getProductsSubtotal())}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="extraAmount">Valor Adicional</Label>
              <Input
                id="extraAmount"
                value={extraAmount}
                onChange={(e) => setExtraAmount(e.target.value)}
                placeholder="0,00"
                type="number"
                step="0.01"
                min="0"
              />
            </div>

            <div className="flex justify-between items-center pt-3 border-t-2 border-blue-200">
              <span className="font-bold text-lg">Total Final:</span>
              <span className="font-bold text-2xl text-green-600">
                {formatCurrency(getTotalAmount())}
              </span>
            </div>
          </div>

          {/* Data e Forma de Pagamento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data da Venda</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
              <Select
                value={formData.paymentMethod}
                onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-4">
            {selectedProducts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="productsNotes">Produtos da Venda</Label>
                <Textarea
                  id="productsNotes"
                  value={formData.notes}
                  readOnly
                  className="bg-slate-100 cursor-not-allowed whitespace-pre-wrap text-xs"
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Observações Adicionais</Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                placeholder="Adicione informações extras quando necessário."
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || getTotalAmount() <= 0} className="flex-1">
              {isLoading ? "Salvando..." : "Registrar Venda"}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}