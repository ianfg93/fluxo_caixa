"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CashFlowService, type CashFlowTransaction, type TransactionCategory, type PaymentMethod } from "@/lib/cash-flow"
import { Package, AlertTriangle } from "lucide-react"
import { ApiClient } from "@/lib/api-client"

interface TransactionProduct {
  product_id: string
  product_name: string
  quantity: number
  current_stock: number
}

interface EditTransactionFormProps {
  transaction: CashFlowTransaction
  onSuccess: () => void
  onCancel: () => void
}

export function EditTransactionForm({ transaction, onSuccess, onCancel }: EditTransactionFormProps) {
  const [formData, setFormData] = useState({
    amount: transaction.amount.toString(),
    category: transaction.category,
    date: new Date(transaction.date).toISOString().split("T")[0],
    notes: transaction.notes || "",
    additionalNotes: "", // Campo para observações adicionais editáveis
    paymentMethod: transaction.paymentMethod || ("" as PaymentMethod | ""),
  })
  
  const [products, setProducts] = useState<TransactionProduct[]>([])
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const categoryOptions = CashFlowService.getCategoryOptions(transaction.type)
  const paymentMethods = CashFlowService.getPaymentMethodOptions()

  // Carregar produtos da transação
  useEffect(() => {
    loadTransactionProducts()
  }, [transaction.id])

  const loadTransactionProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const response = await ApiClient.get(`/api/cash-flow/${transaction.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.products && data.products.length > 0) {
          setProducts(data.products)
          
          // Inicializar quantidades
          const quantities: Record<string, number> = {}
          data.products.forEach((p: TransactionProduct) => {
            quantities[p.product_id] = p.quantity
          })
          setProductQuantities(quantities)

          // Separar observações automáticas das observações adicionais
          if (transaction.notes) {
            const notesText = transaction.notes
            const productsPart = notesText.split('\n\nObservações: ')[0]
            const additionalPart = notesText.split('\n\nObservações: ')[1] || ''
            
            setFormData(prev => ({
              ...prev,
              notes: productsPart,
              additionalNotes: additionalPart
            }))
          }
        }
      }
    } catch (error) {
      console.error("Error loading products:", error)
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const handleProductQuantityChange = (productId: string, newQuantity: number) => {
    if (newQuantity < 0) return
    
    setProductQuantities({
      ...productQuantities,
      [productId]: newQuantity
    })
  }

  const getStockAdjustment = (productId: string, originalQuantity: number): number => {
    const newQuantity = productQuantities[productId] || 0
    return originalQuantity - newQuantity
  }

  // Atualizar observações automaticamente quando produtos mudam
  useEffect(() => {
    if (products.length > 0) {
      const productsList = products
        .map((p) => `${p.product_name} (Qtd: ${productQuantities[p.product_id] || 0})`)
        .join(", ")
      setFormData((prev) => ({ ...prev, notes: `Produtos: ${productsList}` }))
    }
  }, [productQuantities, products])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Validar estoque antes de enviar
      for (const product of products) {
        const newQuantity = productQuantities[product.product_id]
        const adjustment = getStockAdjustment(product.product_id, product.quantity)
        
        // Se estiver aumentando a venda (adjustment negativo), verificar estoque
        if (adjustment < 0) {
          const additionalUnits = Math.abs(adjustment)
          if (product.current_stock < additionalUnits) {
            setError(`Estoque insuficiente para ${product.product_name}. Disponível: ${product.current_stock}`)
            setIsLoading(false)
            return
          }
        }
      }

      // Concatenar observações de produtos com observações adicionais
      let finalNotes = formData.notes
      if (formData.additionalNotes) {
        finalNotes = finalNotes ? `${finalNotes}\n\nObservações: ${formData.additionalNotes}` : formData.additionalNotes
      }

      const updateData: any = {
        description: formData.category.charAt(0).toUpperCase() + formData.category.slice(1),
        amount: Number.parseFloat(formData.amount),
        category: formData.category as TransactionCategory,
        date: new Date(formData.date),
        notes: finalNotes || undefined,
        paymentMethod: formData.paymentMethod || undefined,
      }

      // Adicionar produtos se houver
      if (products.length > 0) {
        updateData.products = products.map(p => ({
          productId: p.product_id,
          quantity: productQuantities[p.product_id]
        }))
      }

      const result = await CashFlowService.updateTransaction(transaction.id, updateData)

      if (result) {
        onSuccess()
      } else {
        setError("Erro ao atualizar a transação. Tente novamente.")
      }
    } catch (error) {
      console.error("Error updating transaction:", error)
      setError("Erro ao atualizar a transação. Verifique os dados e tente novamente.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Editar {transaction.type === "entry" ? "Entrada" : "Saída"}</CardTitle>
        <CardDescription>Modifique os dados da transação</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Seção de Produtos (se houver) */}
          {products.length > 0 && (
            <div className="space-y-4 p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Produtos da Venda</h3>
              </div>

              {isLoadingProducts ? (
                <p className="text-sm text-muted-foreground">Carregando produtos...</p>
              ) : (
                <div className="space-y-3">
                  {products.map((product) => {
                    const originalQty = product.quantity
                    const newQty = productQuantities[product.product_id] || 0
                    const adjustment = getStockAdjustment(product.product_id, originalQty)
                    
                    return (
                      <div key={product.product_id} className="bg-white p-4 rounded-md border">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <p className="font-medium">{product.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Estoque atual: {product.current_stock} unidades
                            </p>
                          </div>
                          
                          <div className="w-32">
                            <Label className="text-xs">Quantidade</Label>
                            <Input
                              type="number"
                              min="0"
                              value={newQty}
                              onChange={(e) => handleProductQuantityChange(
                                product.product_id, 
                                parseInt(e.target.value) || 0
                              )}
                              className="mt-1"
                            />
                          </div>
                        </div>
                        
                        {adjustment !== 0 && (
                          <div className="mt-3 flex items-start gap-2 text-sm">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-amber-700">
                              {adjustment > 0 ? (
                                <>
                                  <strong>Devolução:</strong> {adjustment} {adjustment === 1 ? 'unidade será devolvida' : 'unidades serão devolvidas'} ao estoque
                                </>
                              ) : (
                                <>
                                  <strong>Retirada:</strong> {Math.abs(adjustment)} {Math.abs(adjustment) === 1 ? 'unidade será retirada' : 'unidades serão retiradas'} do estoque
                                </>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {transaction.type === "entry" ? (
            // Layout para ENTRADA
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
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
                <Label htmlFor="date">Data</Label>
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
                {products.length > 0 && (
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
                      Lista automática dos produtos (atualizada conforme você altera as quantidades)
                    </p>
                  </div>
                )}

                {/* Parte 2: Observações livres (editável) */}
                <div className="space-y-2">
                  <Label htmlFor="additionalNotes">
                    Observações Adicionais {!products.length && "(opcional)"}
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
            </div>
          ) : (
            // Layout para SAÍDA
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R$)</Label>
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
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value as TransactionCategory })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Observações divididas em duas partes */}
              <div className="space-y-4">
                {/* Parte 1: Lista de produtos (readonly) - só aparece se houver produtos */}
                {products.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="productsNotesExit">Produtos da Venda</Label>
                    <Textarea
                      id="productsNotesExit"
                      value={formData.notes}
                      readOnly
                      className="bg-slate-100 cursor-not-allowed"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lista automática dos produtos
                    </p>
                  </div>
                )}

                {/* Parte 2: Observações livres (editável) */}
                <div className="space-y-2">
                  <Label htmlFor="additionalNotesExit">
                    Observações {!products.length && "(opcional)"}
                  </Label>
                  <Textarea
                    id="additionalNotesExit"
                    value={formData.additionalNotes}
                    onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
                    placeholder="Informações adicionais sobre a transação"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    Campo livre para adicionar informações adicionais
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="submit" disabled={isLoading || isLoadingProducts} className="flex-1">
              {isLoading ? "Salvando..." : "Salvar Alterações"}
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