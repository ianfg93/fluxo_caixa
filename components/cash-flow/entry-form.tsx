"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CashFlowService, type PaymentMethod, type PaymentSplit } from "@/lib/cash-flow"
import { ProductService, type Product } from "@/lib/products"
import { OpenOrderService, type OpenOrder } from "@/lib/open-orders"
import { CustomerService, type Customer } from "@/lib/customers"
import { Textarea } from "../ui/textarea"
import { Plus, Minus, X, Package, Calculator, Search, Save, DollarSign, Receipt, ArrowLeft, UserCircle } from "lucide-react"
import { getTodayBrazil } from "@/lib/utils"

interface SelectedProduct {
  productId: string
  productName: string
  price: number
  quantity: number
  subtotal: number
  availableStock: number
  orderItemId?: string
}

interface PaymentSplitWithId extends PaymentSplit {
  id: string
  customerId?: string
}

interface EntryFormProps {
  onSuccess: () => void
  onCancel: () => void
  selectedOrder?: OpenOrder | null
  onBackToOrders?: () => void
}

export function EntryForm({ onSuccess, onCancel, selectedOrder, onBackToOrders }: EntryFormProps) {
  const [formData, setFormData] = useState({
    date: getTodayBrazil(),
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
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para Vendas por Forma de Pagamento de pagamento
  const [useMultiplePayments, setUseMultiplePayments] = useState(false)
  const [paymentSplits, setPaymentSplits] = useState<PaymentSplitWithId[]>([])
  const [newPaymentMethod, setNewPaymentMethod] = useState<PaymentMethod | "">("")
  const [newPaymentAmount, setNewPaymentAmount] = useState<string>("")
  const [newPaymentCustomerId, setNewPaymentCustomerId] = useState<string>("") // Cliente para o split sendo adicionado

  // Estados para cálculo de troco
  const [cashGiven, setCashGiven] = useState<string>("")

  // ✅ NOVO: Estados para clientes
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("") // Cliente para pagamento único
  const [customerSearchTerm, setCustomerSearchTerm] = useState<string>("")
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false)

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

  const paymentMethods = CashFlowService.getPaymentMethodOptions()

  useEffect(() => {
    loadProducts()
    loadCustomers()
  }, [])

  // Carregar dados da comanda selecionada
  useEffect(() => {
    if (selectedOrder) {
      setSelectedProducts(
        (selectedOrder.items || []).map((item) => ({
          productId: item.productId,
          productName: item.productName,
          price: item.productPrice,
          quantity: item.quantity,
          subtotal: item.subtotal,
          availableStock: 0,
          orderItemId: item.id,
        }))
      )
      setExtraAmount(selectedOrder.extraAmount.toString())
      setFormData((prev) => ({
        ...prev,
        additionalNotes: selectedOrder.notes || "",
      }))
    }
  }, [selectedOrder])

  // ✅ NOVO: Limpar cliente quando mudar forma de pagamento
  useEffect(() => {
    if (formData.paymentMethod !== 'a_prazo') {
      setSelectedCustomerId("")
    }
  }, [formData.paymentMethod])

  const loadProducts = async () => {
    setIsLoadingProducts(true)
    const data = await ProductService.getProducts()
    setProducts(data)
    setIsLoadingProducts(false)
  }

  // ✅ NOVO: Carregar clientes
  const loadCustomers = async () => {
    setIsLoadingCustomers(true)
    const data = await CustomerService.getCustomers(true)
    setCustomers(data)
    setIsLoadingCustomers(false)
  }

  const filteredAvailableProducts = useMemo(() => {
    const searchLower = productSearchTerm.toLowerCase().trim()
    
    return products
      .filter((p) => p.quantity > 0)
      .filter((p) => {
        if (!searchLower) return true
        
        const matchesName = p.name.toLowerCase().includes(searchLower)
        const matchesCode = p.code.toString().includes(searchLower)
        const matchesBarcode = p.barcode && p.barcode.toLowerCase().includes(searchLower)
        
        return matchesName || matchesCode || matchesBarcode
      })
  }, [products, productSearchTerm])

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

  // Funções para múltiplas formas de pagamento
  const getTotalPaymentSplits = (): number => {
    return paymentSplits.reduce((sum, split) => sum + split.amount, 0)
  }

  const getRemainingAmount = (): number => {
    const total = getTotalAmount()
    const paid = getTotalPaymentSplits()
    return Math.max(0, total - paid)
  }

  const handleAddPaymentSplit = () => {
    if (!newPaymentMethod || !newPaymentAmount) {
      setError("Selecione a forma de pagamento e informe o valor")
      return
    }

    // Validar cliente para pagamento a prazo
    if (newPaymentMethod === 'a_prazo' && !newPaymentCustomerId) {
      setError("Selecione um cliente para pagamento a prazo")
      return
    }

    const amount = parseFloat(newPaymentAmount)
    if (amount <= 0) {
      setError("O valor deve ser maior que zero")
      return
    }

    const remaining = getRemainingAmount()
    if (Math.round(amount * 100) > Math.round(remaining * 100)) {
      setError(`O valor não pode ser maior que o restante: ${formatCurrency(remaining)}`)
      return
    }

    setPaymentSplits([
      ...paymentSplits,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        paymentMethod: newPaymentMethod,
        amount,
        customerId: newPaymentMethod === 'a_prazo' ? newPaymentCustomerId : undefined,
      },
    ])

    setNewPaymentMethod("")
    setNewPaymentAmount("")
    setNewPaymentCustomerId("")
    setError(null)
  }

  const handleRemovePaymentSplit = (id: string) => {
    setPaymentSplits(paymentSplits.filter((split) => split.id !== id))
  }

  // Função para calcular o troco
  const calculateChange = (): number => {
    if (!cashGiven) return 0
    const given = parseFloat(cashGiven)
    const total = getTotalAmount()
    return Math.max(0, given - total)
  }

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId)
    setCurrentQuantity("1")
    setError(null)
  }

  const handleAddProduct = async () => {
    if (!selectedProductId || !currentQuantity) {
      setError("Selecione um produto e informe a quantidade")
      return
    }

    const quantity = parseInt(currentQuantity)
    if (quantity <= 0) {
      setError("Quantidade deve ser maior que zero")
      return
    }

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) {
      setError("Produto não encontrado")
      return
    }

    const existingProduct = selectedProducts.find((p) => p.productId === selectedProductId)

    if (existingProduct) {
      // Produto já está na lista — apenas incrementa a quantidade
      const newQty = existingProduct.quantity + quantity
      if (newQty > product.quantity) {
        setError(`Estoque insuficiente. Disponível: ${product.quantity}`)
        return
      }
      const newSubtotal = product.price * newQty

      if (selectedOrder && existingProduct.orderItemId) {
        const success = await OpenOrderService.updateItemQuantity(existingProduct.orderItemId, selectedOrder.id, newQty)
        if (!success) {
          setError("Erro ao atualizar quantidade na comanda")
          return
        }
      }

      setSelectedProducts(selectedProducts.map((p) =>
        p.productId === selectedProductId
          ? { ...p, quantity: newQty, subtotal: newSubtotal }
          : p
      ))
      setSelectedProductId("")
      setCurrentQuantity("1")
      setProductSearchTerm("")
      setError(null)
      return
    }

    if (quantity > product.quantity) {
      setError(`Estoque insuficiente. Disponível: ${product.quantity}`)
      return
    }

    const subtotal = product.price * quantity
    let orderItemId: string | undefined

    if (selectedOrder) {
      const result = await OpenOrderService.addItemToOrder({
        orderId: selectedOrder.id,
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        quantity,
      })

      if (!result.success) {
        setError("Erro ao adicionar produto à comanda")
        return
      }
      orderItemId = result.itemId
    }

    setSelectedProducts([
      ...selectedProducts,
      {
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity,
        subtotal,
        availableStock: product.quantity,
        orderItemId,
      },
    ])

    setSelectedProductId("")
    setCurrentQuantity("1")
    setProductSearchTerm("")
    setError(null)
  }

  const handleUpdateProductQuantity = async (productId: string, newQuantity: number) => {
    const item = selectedProducts.find((p) => p.productId === productId)
    if (!item) return

    if (newQuantity <= 0) {
      await handleRemoveProduct(productId)
      return
    }

    const productData = products.find((p) => p.id === productId)
    if (productData && newQuantity > productData.quantity) {
      setError(`Estoque insuficiente. Disponível: ${productData.quantity}`)
      return
    }

    const newSubtotal = item.price * newQuantity

    if (selectedOrder && item.orderItemId) {
      const success = await OpenOrderService.updateItemQuantity(item.orderItemId, selectedOrder.id, newQuantity)
      if (!success) {
        setError("Erro ao atualizar quantidade na comanda")
        return
      }
    }

    setSelectedProducts(selectedProducts.map((p) =>
      p.productId === productId
        ? { ...p, quantity: newQuantity, subtotal: newSubtotal }
        : p
    ))
    setError(null)
  }

  const handleRemoveProduct = async (productId: string) => {
    if (selectedOrder) {
      const item = selectedProducts.find((p) => p.productId === productId)
      if (item?.orderItemId) {
        const success = await OpenOrderService.removeItemFromOrder(item.orderItemId, selectedOrder.id)
        if (!success) {
          setError("Erro ao remover produto da comanda")
          return
        }
      }
    }

    setSelectedProducts(selectedProducts.filter((p) => p.productId !== productId))
  }

  const handleSaveOrder = async () => {
    if (!selectedOrder) return

    setIsSavingOrder(true)
    setError(null)

    try {
      const extra = Number.parseFloat(extraAmount) || 0
      
      await OpenOrderService.updateOrderExtraAmount(selectedOrder.id, extra)
      await OpenOrderService.updateOrderNotes(selectedOrder.id, formData.additionalNotes)

      if (onBackToOrders) {
        onBackToOrders()
      }
    } catch (error) {
      console.error("Erro ao salvar comanda:", error)
      setError("Erro ao salvar comanda. Tente novamente.")
    } finally {
      setIsSavingOrder(false)
    }
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

      // Validar pagamentos múltiplos
      if (useMultiplePayments) {
        const totalPaid = getTotalPaymentSplits()
        if (totalPaid < totalAmount) {
          setError(`Falta pagar ${formatCurrency(totalAmount - totalPaid)}. Adicione mais formas de pagamento.`)
          setIsLoading(false)
          return
        }
        if (paymentSplits.length === 0) {
          setError("Adicione pelo menos uma forma de pagamento")
          setIsLoading(false)
          return
        }
      }

      // ✅ NOVO: Validar cliente para venda a prazo
      if (!useMultiplePayments && formData.paymentMethod === 'a_prazo' && !selectedCustomerId) {
        setError("Selecione um cliente para venda a prazo")
        setIsLoading(false)
        return
      }

      // Criar a data no horário local para evitar problemas de fuso horário
      const [year, month, day] = formData.date.split('-').map(Number)
      const localDate = new Date(year, month - 1, day, 12, 0, 0)

      const transactionData: any = {
        type: "entry",
        description: selectedOrder ? `Venda - ${selectedOrder.orderNumber}` : "Venda",
        amount: totalAmount,
        category: "vendas",
        date: localDate,
        paymentMethod: useMultiplePayments ? undefined : (formData.paymentMethod || undefined),
        notes: formData.notes || undefined,
      }

      // Adicionar informações de múltiplos pagamentos
      if (useMultiplePayments) {
        transactionData.paymentSplits = paymentSplits.map(split => ({
          paymentMethod: split.paymentMethod,
          amount: split.amount,
        }))

        // Adicionar nota sobre formas de pagamento
        const paymentDetails = paymentSplits
          .map(split => `${CashFlowService.formatPaymentMethod(split.paymentMethod)}: ${formatCurrency(split.amount)}`)
          .join(", ")

        transactionData.notes = transactionData.notes
          ? `${transactionData.notes}\n\nFormas de Pagamento: ${paymentDetails}`
          : `Formas de Pagamento: ${paymentDetails}`
      }

      // Adicionar informação de troco para pagamento em dinheiro
      if (!useMultiplePayments && formData.paymentMethod === 'dinheiro' && cashGiven) {
        const given = parseFloat(cashGiven)
        const change = calculateChange()
        if (given > 0 && change > 0) {
          transactionData.notes = transactionData.notes
            ? `${transactionData.notes}\n\nDinheiro recebido: ${formatCurrency(given)} | Troco: ${formatCurrency(change)}`
            : `Dinheiro recebido: ${formatCurrency(given)} | Troco: ${formatCurrency(change)}`
        }
      }

      // ✅ NOVO: Lógica para vendas a prazo
      if (!useMultiplePayments && formData.paymentMethod === 'a_prazo' && selectedCustomerId) {
        const customer = customers.find(c => c.id === selectedCustomerId)
        transactionData.customerId = selectedCustomerId
        transactionData.amountReceived = 0 // Venda a prazo não recebeu nada ainda
        
        if (customer) {
          transactionData.description = `Venda a prazo - ${customer.name}`
          const customerInfo = `Cliente: ${customer.name}${customer.cpfCnpj ? ` (${customer.cpfCnpj})` : ''}`
          
          if (transactionData.notes) {
            transactionData.notes = `${customerInfo}\n\n${transactionData.notes}`
          } else {
            transactionData.notes = customerInfo
          }
        }
      } else {
        transactionData.amountReceived = totalAmount // Recebeu tudo
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

      if (selectedOrder) {
        await OpenOrderService.closeOrder(selectedOrder.id)
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
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {selectedOrder && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  <Receipt className="h-3 w-3 mr-1" />
                  {selectedOrder.orderNumber}
                </Badge>
              )}
              {selectedOrder ? "Editar Comanda" : "Nova Entrada (Venda)"}
            </CardTitle>
            <CardDescription>
              {selectedOrder 
                ? "Adicione produtos e finalize a venda quando estiver pronto"
                : "Registre uma nova venda ou entrada de dinheiro"}
            </CardDescription>
          </div>
          {selectedOrder && onBackToOrders && (
            <Button variant="outline" size="sm" onClick={onBackToOrders}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seção de Produtos */}
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold">Produtos da Venda</h3>
            </div>

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

            {selectedProducts.length > 0 && (
              <div className="space-y-2 mt-4">
                <Label>Produtos Adicionados:</Label>
                <div className="space-y-2">
                  {selectedProducts.map((product) => (
                    <div
                      key={product.productId}
                      className="flex items-center justify-between p-3 bg-white border rounded-md"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium truncate">{product.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(product.price)} = <span className="font-semibold text-green-600">{formatCurrency(product.subtotal)}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateProductQuantity(product.productId, product.quantity - 1)}
                          className="h-7 w-7 p-0"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-7 text-center font-semibold text-sm">{product.quantity}</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateProductQuantity(product.productId, product.quantity + 1)}
                          className="h-7 w-7 p-0"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveProduct(product.productId)}
                          className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600 ml-1"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
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

          {/* Data da Venda */}
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

          {/* Seção de Pagamento */}
          <div className="space-y-4 p-4 border rounded-lg bg-green-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">Formas de Pagamento</h3>
              </div>
              <Button
                type="button"
                variant={useMultiplePayments ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setUseMultiplePayments(!useMultiplePayments)
                  if (!useMultiplePayments) {
                    setPaymentSplits([])
                    setFormData({ ...formData, paymentMethod: "" })
                  }
                  setCashGiven("")
                }}
              >
                {useMultiplePayments ? "Pagamento Único" : "Múltiplas Formas"}
              </Button>
            </div>

            {!useMultiplePayments ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) => {
                      setFormData({ ...formData, paymentMethod: value as PaymentMethod })
                      setCashGiven("")
                    }}
                    required={!useMultiplePayments}
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

                {/* Calculadora de Troco para Dinheiro */}
                {formData.paymentMethod === 'dinheiro' && (
                  <div className="space-y-3 p-3 bg-green-100 border-2 border-green-300 rounded-md">
                    <Label htmlFor="cashGiven">Valor recebido - (Opcional)</Label>
                    <Input
                      id="cashGiven"
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashGiven}
                      onChange={(e) => setCashGiven(e.target.value)}
                      placeholder="Ex: 50.00"
                    />
                    {cashGiven && parseFloat(cashGiven) >= getTotalAmount() && (
                      <div className="p-3 bg-white border-2 border-green-500 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-green-900">Troco a devolver:</span>
                          <span className="text-2xl font-bold text-green-600">
                            {formatCurrency(calculateChange())}
                          </span>
                        </div>
                      </div>
                    )}
                    {cashGiven && parseFloat(cashGiven) < getTotalAmount() && (
                      <div className="p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                        ⚠️ Valor insuficiente. Falta: {formatCurrency(getTotalAmount() - parseFloat(cashGiven))}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Interface para Múltiplas Formas de Pagamento */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="newPaymentMethod">Forma de Pagamento</Label>
                      <Select
                        value={newPaymentMethod}
                        onValueChange={(value) => {
                          setNewPaymentMethod(value as PaymentMethod)
                          if (value !== 'a_prazo') {
                            setNewPaymentCustomerId("")
                          }
                        }}
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
                      <Label htmlFor="newPaymentAmount">Valor</Label>
                      <Input
                        id="newPaymentAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={newPaymentAmount}
                        onChange={(e) => setNewPaymentAmount(e.target.value)}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  {/* Seletor de Cliente para A Prazo */}
                  {newPaymentMethod === 'a_prazo' && (
                    <div className="space-y-3 p-4 border-2 rounded-lg bg-orange-50 border-orange-300">
                      <div className="flex items-center gap-2">
                        <UserCircle className="h-5 w-5 text-orange-600" />
                        <h4 className="font-semibold text-orange-900">Selecionar Cliente *</h4>
                      </div>

                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
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
                                setNewPaymentCustomerId("")
                              }}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lista de Clientes Filtrados */}
                      {customerSearchTerm && (
                        <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md bg-white p-2">
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
                                  setNewPaymentCustomerId(customer.id)
                                  setCustomerSearchTerm("")
                                }}
                                className={`p-3 rounded-md border cursor-pointer transition-colors ${
                                  newPaymentCustomerId === customer.id
                                    ? 'bg-orange-100 border-orange-400'
                                    : 'hover:bg-gray-50 border-gray-200'
                                }`}
                              >
                                <p className="font-medium text-sm">{customer.name}</p>
                                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                                  {customer.cpfCnpj && <span>CPF/CNPJ: {customer.cpfCnpj}</span>}
                                  {customer.phone && <span>Tel: {customer.phone}</span>}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {/* Cliente Selecionado */}
                      {newPaymentCustomerId && !customerSearchTerm && (
                        <div className="p-3 bg-white border-2 border-orange-400 rounded-md">
                          <p className="text-sm font-medium text-orange-900">Cliente selecionado:</p>
                          <p className="font-semibold">
                            {customers.find(c => c.id === newPaymentCustomerId)?.name || "Cliente não encontrado"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={handleAddPaymentSplit}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Forma de Pagamento
                  </Button>
                </div>

                {/* Lista de Pagamentos Adicionados */}
                {paymentSplits.length > 0 && (
                  <div className="space-y-2">
                    <Label>Pagamentos Adicionados:</Label>
                    <div className="space-y-2">
                      {paymentSplits.map((split) => {
                        const customer = split.customerId ? customers.find(c => c.id === split.customerId) : null
                        return (
                          <div
                            key={split.id}
                            className="flex items-center justify-between p-3 bg-white border rounded-md"
                          >
                            <div className="flex-1">
                              <p className="font-medium">{CashFlowService.formatPaymentMethod(split.paymentMethod)}</p>
                              <p className="text-sm text-green-600 font-semibold">{formatCurrency(split.amount)}</p>
                              {customer && (
                                <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                  <UserCircle className="h-3 w-3" />
                                  {customer.name}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemovePaymentSplit(split.id)}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        )
                      })}
                    </div>

                    <div className="pt-3 border-t-2 border-green-300 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold">Total Pago:</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(getTotalPaymentSplits())}
                        </span>
                      </div>
                      {getRemainingAmount() > 0 && (
                        <div className="flex justify-between items-center text-orange-600">
                          <span className="font-semibold">Falta Pagar:</span>
                          <span className="text-lg font-bold">
                            {formatCurrency(getRemainingAmount())}
                          </span>
                        </div>
                      )}
                      {getTotalPaymentSplits() >= getTotalAmount() && (
                        <div className="p-2 bg-green-100 border border-green-400 rounded text-sm text-green-700 text-center">
                          ✓ Pagamento completo!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ✅ NOVO: Seleção de Cliente - Apenas para A Prazo */}
{!useMultiplePayments && formData.paymentMethod === 'a_prazo' && (
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

    {/* Lista de Clientes Filtrados */}
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

    {/* Cliente Selecionado */}
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
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
                {error}
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
            {selectedOrder ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveOrder}
                  disabled={isSavingOrder}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSavingOrder ? "Salvando..." : "Salvar Comanda"}
                </Button>
                <Button type="submit" disabled={isLoading || getTotalAmount() <= 0} className="flex-1">
                  <DollarSign className="h-4 w-4 mr-2" />
                  {isLoading ? "Finalizando..." : "Finalizar Venda"}
                </Button>
              </>
            ) : (
              <>
                <Button type="submit" disabled={isLoading || getTotalAmount() <= 0} className="flex-1">
                  {isLoading ? "Salvando..." : "Registrar Venda"}
                </Button>
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                  Cancelar
                </Button>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}