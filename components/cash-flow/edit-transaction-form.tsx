"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CashFlowService, type CashFlowTransaction, type TransactionCategory, type PaymentMethod } from "@/lib/cash-flow"
import { CustomerService, type Customer } from "@/lib/customers"
import { Package, AlertTriangle, Search, X, UserCircle } from "lucide-react"
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
    category: transaction.category || (transaction.type === "entry" ? "vendas" : "compras"),
    date: new Date(transaction.date).toISOString().split("T")[0],
    notes: transaction.notes || "",
    additionalNotes: "",
    paymentMethod: transaction.paymentMethod || "dinheiro",
  })
  
  const [products, setProducts] = useState<TransactionProduct[]>([])
  const [productQuantities, setProductQuantities] = useState<Record<string, number>>({})
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ✅ NOVO: Estados para clientes
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(transaction.customerId || "")
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>("")
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)

  const categoryOptions = CashFlowService.getCategoryOptions(transaction.type)
  const paymentMethods = CashFlowService.getPaymentMethodOptions()

  // ✅ NOVO: Filtro de clientes
  const filteredCustomers = useMemo(() => {
    if (!customerSearchTerm.trim()) {
      return customers
    }
    
    const searchLower = customerSearchTerm.toLowerCase()
    return customers.filter(customer => 
      customer.name.toLowerCase().includes(searchLower) ||
      customer.cpfCnpj?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower)
    )
  }, [customers, customerSearchTerm])

  useEffect(() => {
    loadTransactionProducts()
    loadCustomers()
  }, [transaction.id])

  // ✅ NOVO: Carregar clientes
  const loadCustomers = async () => {
    setIsLoadingCustomers(true)
    const data = await CustomerService.getCustomers(true)
    setCustomers(data)
    setIsLoadingCustomers(false)
  }

  // ✅ NOVO: Limpar cliente quando mudar forma de pagamento
  useEffect(() => {
    if (formData.paymentMethod !== 'a_prazo') {
      setSelectedCustomerId("")
    }
  }, [formData.paymentMethod])

  const loadTransactionProducts = async () => {
    setIsLoadingProducts(true)
    try {
      const response = await ApiClient.get(`/api/cash-flow/${transaction.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.products && data.products.length > 0) {
          setProducts(data.products)
          
          const quantities: Record<string, number> = {}
          data.products.forEach((p: TransactionProduct) => {
            quantities[p.product_id] = p.quantity
          })
          setProductQuantities(quantities)

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

  useEffect(() => {
    if (products.length > 0) {
      const productsList = products
        .map((p) => `${p.product_name} (Qtd: ${productQuantities[p.product_id] || 0})`)
        .join(", ")
      setFormData((prev) => ({ ...prev, notes: `Produtos: ${productsList}` }))
    }
  }, [productQuantities, products])

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // ✅ NOVO: Validar cliente para venda a prazo
      if (formData.paymentMethod === 'a_prazo' && !selectedCustomerId) {
        setError("Selecione um cliente para venda a prazo")
        setIsLoading(false)
        return
      }

      // Validar estoque
      for (const product of products) {
        const newQuantity = productQuantities[product.product_id]
        const adjustment = getStockAdjustment(product.product_id, product.quantity)
        
        if (adjustment < 0) {
          const additionalUnits = Math.abs(adjustment)
          if (product.current_stock < additionalUnits) {
            setError(`Estoque insuficiente para ${product.product_name}. Disponível: ${product.current_stock}`)
            setIsLoading(false)
            return
          }
        }
      }

      let finalNotes = formData.notes
      if (formData.additionalNotes) {
        finalNotes = finalNotes ? `${finalNotes}\n\nObservações: ${formData.additionalNotes}` : formData.additionalNotes
      }

      // Criar a data no horário local para evitar problemas de fuso horário
      const [year, month, day] = formData.date.split('-').map(Number)
      const localDate = new Date(year, month - 1, day, 12, 0, 0)

      const updateData: any = {
        description: formData.category.charAt(0).toUpperCase() + formData.category.slice(1),
        amount: Number.parseFloat(formData.amount),
        category: formData.category as TransactionCategory,
        date: localDate,
        notes: finalNotes || undefined,
        paymentMethod: formData.paymentMethod || undefined,
      }

      // ✅ NOVO: Lógica para vendas a prazo
      if (formData.paymentMethod === 'a_prazo' && selectedCustomerId) {
        const customer = customers.find(c => c.id === selectedCustomerId)
        updateData.customerId = selectedCustomerId
        updateData.amountReceived = 0
        
        if (customer) {
          updateData.description = `Venda a prazo - ${customer.name}`
          const customerInfo = `Cliente: ${customer.name}${customer.cpfCnpj ? ` (${customer.cpfCnpj})` : ''}`
          
          if (updateData.notes) {
            updateData.notes = `${customerInfo}\n\n${updateData.notes}`
          } else {
            updateData.notes = customerInfo
          }
        }
      } else {
        updateData.amountReceived = Number.parseFloat(formData.amount)
        updateData.customerId = null
      }

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

          {/* Seção de Produtos */}
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

              {/* ✅ NOVO: Seleção de Cliente - Apenas para A Prazo */}
              {formData.paymentMethod === 'a_prazo' && (
                <div className="space-y-3 p-4 border-2 rounded-lg bg-orange-50 border-orange-300">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCircle className="h-5 w-5 text-orange-600" />
                    <h3 className="font-semibold text-orange-900">Venda a Prazo</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customerSearch" className="text-orange-900">Buscar Cliente *</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="customerSearch"
                        type="text"
                        placeholder="Digite o nome, CPF/CNPJ ou telefone do cliente..."
                        value={customerSearchTerm}
                        onChange={(e) => setCustomerSearchTerm(e.target.value)}
                        className="pl-10 bg-white border-orange-300"
                        disabled={isLoadingCustomers}
                      />
                      {customerSearchTerm && (
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerSearchTerm("")
                            setSelectedCustomerId("")
                          }}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {customerSearchTerm && (
                    <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md bg-white p-2">
                      {isLoadingCustomers ? (
                        <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                      ) : filteredCustomers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {customers.length === 0 
                            ? "Nenhum cliente cadastrado" 
                            : "Nenhum cliente encontrado"}
                        </p>
                      ) : (
                        filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            onClick={() => {
                              setSelectedCustomerId(customer.id)
                              setCustomerSearchTerm("")
                            }}
                            className={`p-3 rounded-md cursor-pointer transition-colors ${
                              selectedCustomerId === customer.id
                                ? "bg-orange-100 border-2 border-orange-500"
                                : "bg-slate-50 hover:bg-slate-100 border border-slate-200"
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium">{customer.name}</p>
                                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                  {customer.cpfCnpj && <span>CPF/CNPJ: {customer.cpfCnpj}</span>}
                                  {customer.phone && (
                                    <>
                                      {customer.cpfCnpj && <span>•</span>}
                                      <span>Tel: {customer.phone}</span>
                                    </>
                                  )}
                                </div>
                                {customer.balance !== undefined && customer.balance > 0 && (
                                  <Badge variant="destructive" className="mt-1 text-xs">
                                    Devendo: {formatCurrency(customer.balance)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {selectedCustomerId && !customerSearchTerm && (
                    <div className="p-3 bg-orange-100 border-2 border-orange-500 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-orange-900">Cliente Selecionado:</p>
                          <p className="text-sm">
                            {customers.find(c => c.id === selectedCustomerId)?.name}
                            {customers.find(c => c.id === selectedCustomerId)?.cpfCnpj && 
                              ` - ${customers.find(c => c.id === selectedCustomerId)?.cpfCnpj}`}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedCustomerId("")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-orange-700 mt-2">
                    ⚠️ Esta venda será registrada com valor recebido R$ 0,00. O pagamento deverá ser lançado posteriormente na aba "Contas a Receber".
                  </p>
                </div>
              )}

              <div className="space-y-4">
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
            // Layout para SAÍDA (mantém o original)
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

              <div className="space-y-4">
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