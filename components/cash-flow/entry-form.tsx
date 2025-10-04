"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CashFlowService, type PaymentMethod } from "@/lib/cash-flow"
import { ProductService, type Product } from "@/lib/products"
import { Textarea } from "../ui/textarea"
import { Plus, X, Package } from "lucide-react"

interface SelectedProduct {
  productId: string
  productName: string
  quantity: number
  availableStock: number
}

interface EntryFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function EntryForm({ onSuccess, onCancel }: EntryFormProps) {
  const [formData, setFormData] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "" as PaymentMethod | "",
    notes: "",
    additionalNotes: "", // Novo campo para observações livres
  })
  
  const [products, setProducts] = useState<Product[]>([])
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [currentProduct, setCurrentProduct] = useState<string>("")
  const [currentQuantity, setCurrentQuantity] = useState<string>("1")
  
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingProducts, setIsLoadingProducts] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const paymentMethods = CashFlowService.getPaymentMethodOptions()

  // Carregar produtos disponíveis
  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    setIsLoadingProducts(true)
    const data = await ProductService.getProducts()
    setProducts(data)
    setIsLoadingProducts(false)
  }

  // Atualizar observações quando produtos selecionados mudam
  useEffect(() => {
    if (selectedProducts.length > 0) {
      const productList = selectedProducts
        .map((p) => `${p.productName} (Qtd: ${p.quantity})`)
        .join(", ")
      setFormData((prev) => ({ ...prev, notes: `Produtos: ${productList}` }))
    } else {
      setFormData((prev) => ({ ...prev, notes: "" }))
    }
  }, [selectedProducts])

  const handleAddProduct = () => {
    if (!currentProduct || !currentQuantity) {
      setError("Selecione um produto e informe a quantidade")
      return
    }

    const quantity = parseInt(currentQuantity)
    if (quantity <= 0) {
      setError("Quantidade deve ser maior que zero")
      return
    }

    // Verificar se produto já foi adicionado
    if (selectedProducts.some((p) => p.productId === currentProduct)) {
      setError("Este produto já foi adicionado")
      return
    }

    const product = products.find((p) => p.id === currentProduct)
    if (!product) {
      setError("Produto não encontrado")
      return
    }

    // Verificar estoque disponível
    const stockAlreadyUsed = selectedProducts
      .filter((p) => p.productId === currentProduct)
      .reduce((sum, p) => sum + p.quantity, 0)
    
    const availableStock = product.quantity - stockAlreadyUsed

    if (quantity > availableStock) {
      setError(`Estoque insuficiente. Disponível: ${availableStock}`)
      return
    }

    // Adicionar produto
    setSelectedProducts([
      ...selectedProducts,
      {
        productId: product.id,
        productName: product.name,
        quantity,
        availableStock: product.quantity,
      },
    ])

    // Limpar seleção
    setCurrentProduct("")
    setCurrentQuantity("1")
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
      const amount = Number.parseFloat(formData.amount)

      // Preparar dados da transação
      const transactionData: any = {
        type: "entry",
        description: "Venda",
        amount,
        category: "vendas",
        date: new Date(formData.date),
        paymentMethod: formData.paymentMethod || undefined,
        notes: formData.notes || undefined,
      }

      // Adicionar observações adicionais ao final das observações de produtos
      if (formData.additionalNotes) {
        if (transactionData.notes) {
          transactionData.notes += `\n\nObservações: ${formData.additionalNotes}`
        } else {
          transactionData.notes = formData.additionalNotes
        }
      }

      // Se houver produtos selecionados, adicionar ao payload
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

            {/* Adicionar Produto */}
            <div className="grid grid-cols-12 gap-3">
              <div className="col-span-6 space-y-2">
                <Label htmlFor="product">Produto</Label>
                <Select
                  value={currentProduct}
                  onValueChange={setCurrentProduct}
                  disabled={isLoadingProducts}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingProducts ? "Carregando..." : "Selecione um produto"} />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter((p) => p.quantity > 0)
                      .map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} (Est: {product.quantity})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-3 space-y-2">
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={currentQuantity}
                  onChange={(e) => setCurrentQuantity(e.target.value)}
                />
              </div>

              <div className="col-span-3 flex items-end">
                <Button
                  type="button"
                  onClick={handleAddProduct}
                  disabled={!currentProduct || isLoadingProducts}
                  className="w-full"
                  variant="outline"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
            </div>

            {/* Lista de Produtos Selecionados */}
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
                          Quantidade: {product.quantity} (Estoque disponível: {product.availableStock})
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

          {/* Valor e Pagamento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor Total (R$)</Label>
              <Input
                id="amount"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0,00"
                required
                type="number"
                step="0.01"
                min="0"
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

          {/* Observações divididas em duas partes */}
          <div className="space-y-4">
            {/* Parte 1: Lista de produtos (readonly) */}
            {selectedProducts.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="productsNotes">Produtos da Venda</Label>
                <Textarea
                  id="productsNotes"
                  value={formData.notes}
                  readOnly
                  className="bg-slate-100 cursor-not-allowed whitespace-pre-wrap"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Lista automática dos produtos selecionados
                </p>
              </div>
            )}

            {/* Parte 2: Observações livres (editável) */}
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">
                Observações Adicionais {!selectedProducts.length && "(opcional)"}
              </Label>
              <Textarea
                id="additionalNotes"
                value={formData.additionalNotes}
                onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                placeholder="Adicione informações extras: nome do cliente, forma de entrega, etc."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Campo livre para você adicionar qualquer informação adicional
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading} className="flex-1">
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