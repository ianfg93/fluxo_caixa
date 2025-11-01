"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Save, ArrowLeft, AlertCircle, Package } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { VendorsService, type Vendor } from "@/lib/vendors"
import { ProductService, type Product } from "@/lib/products"
import { ApiClient } from "@/lib/api-client"

interface NFEItem {
  productId: string
  productDescription: string
  productCode: string
  unit: string
  quantity: string
  unitPrice: string
  totalPrice: string
  discount: string
  ncm: string
  cfop: string
  notes: string
}

export default function NewNFePage() {
  const router = useRouter()
  const { authState } = useAuth()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [products, setProducts] = useState<Product[]>([])

  // Dados da NF-e
  const [nfeData, setNfeData] = useState({
    vendorId: "",
    nfeNumber: "",
    nfeSeries: "",
    nfeAccessKey: "",
    nfeProtocol: "",
    issueDate: "",
    receiptDate: new Date().toISOString().split("T")[0],
    operationType: "purchase",
    cfop: "",
    notes: "",
  })

  // Valores
  const [values, setValues] = useState({
    totalProducts: "0.00",
    totalTax: "0.00",
    freightValue: "0.00",
    insuranceValue: "0.00",
    discountValue: "0.00",
    otherExpenses: "0.00",
    icmsValue: "0.00",
    ipiValue: "0.00",
    pisValue: "0.00",
    cofinsValue: "0.00",
  })

  // Pagamento
  const [payment, setPayment] = useState({
    paymentStatus: "pending",
    paymentMethod: "",
    paymentCategory: "Compras",
    paymentTerms: "",
    installments: "1",
    firstDueDate: "",
  })

  // Itens da NF-e
  const [items, setItems] = useState<NFEItem[]>([])
  const [currentItem, setCurrentItem] = useState<NFEItem>({
    productId: "",
    productDescription: "",
    productCode: "",
    unit: "UN",
    quantity: "",
    unitPrice: "",
    totalPrice: "0.00",
    discount: "0.00",
    ncm: "",
    cfop: "",
    notes: "",
  })

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true)
      await Promise.all([loadVendors(), loadProducts()])
      setLoadingData(false)
    }
    loadData()
  }, [])

  const loadVendors = async () => {
    try {
      console.log('Carregando fornecedores...')
      const vendorsData = await VendorsService.getVendors()
      console.log('Vendors data:', vendorsData)
      setVendors(vendorsData)
    } catch (error) {
      console.error("Error loading vendors:", error)
      alert('Erro ao carregar fornecedores. Verifique se você está autenticado.')
      setVendors([])
    }
  }

  const loadProducts = async () => {
    try {
      console.log('Carregando produtos...')
      const productsData = await ProductService.getProducts()
      console.log('Products data:', productsData)
      setProducts(productsData)
    } catch (error) {
      console.error("Error loading products:", error)
      alert('Erro ao carregar produtos. Verifique se você está autenticado.')
      setProducts([])
    }
  }

  const handleProductSelect = (productId: string) => {
    const product = products.find((p) => p.id === productId)
    if (product) {
      setCurrentItem({
        ...currentItem,
        productId: product.id,
        productDescription: product.name,
        productCode: product.code.toString(),
        unitPrice: product.price?.toString() || "0.00",
      })
    }
  }

  const calculateItemTotal = () => {
    const qty = parseFloat(currentItem.quantity) || 0
    const price = parseFloat(currentItem.unitPrice) || 0
    const discount = parseFloat(currentItem.discount) || 0
    const total = qty * price - discount
    return total.toFixed(2)
  }

  const addItem = () => {
    if (!currentItem.productId) {
      alert("Selecione um produto")
      return
    }
    if (!currentItem.quantity || parseFloat(currentItem.quantity) <= 0) {
      alert("Informe uma quantidade válida")
      return
    }

    const totalPrice = calculateItemTotal()
    const newItem = { ...currentItem, totalPrice }
    setItems([...items, newItem])

    // Resetar formulário de item
    setCurrentItem({
      productId: "",
      productDescription: "",
      productCode: "",
      unit: "UN",
      quantity: "",
      unitPrice: "",
      totalPrice: "0.00",
      discount: "0.00",
      ncm: "",
      cfop: "",
      notes: "",
    })

    // Recalcular total
    calculateTotals([...items, newItem])
  }

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    setItems(newItems)
    calculateTotals(newItems)
  }

  const calculateTotals = (itemsList: NFEItem[]) => {
    const totalProducts = itemsList.reduce((sum, item) => sum + parseFloat(item.totalPrice), 0)
    setValues((prev) => ({ ...prev, totalProducts: totalProducts.toFixed(2) }))
  }

  const getTotalInvoice = () => {
    const total =
      parseFloat(values.totalProducts) +
      parseFloat(values.totalTax) +
      parseFloat(values.freightValue) +
      parseFloat(values.insuranceValue) +
      parseFloat(values.otherExpenses) -
      parseFloat(values.discountValue)
    return total.toFixed(2)
  }

  const handleSubmit = async () => {
    // Validações
    if (!nfeData.vendorId) {
      alert("Selecione um fornecedor")
      return
    }
    if (!nfeData.nfeNumber || !nfeData.nfeSeries) {
      alert("Informe o número e série da NF-e")
      return
    }
    if (!nfeData.issueDate) {
      alert("Informe a data de emissão")
      return
    }
    if (items.length === 0) {
      alert("Adicione pelo menos um item à nota fiscal")
      return
    }

    if (payment.paymentStatus === "pending" && payment.installments) {
      const installments = parseInt(payment.installments)
      if (installments > 0 && !payment.firstDueDate) {
        alert("Informe a data do primeiro vencimento para gerar as contas a pagar")
        return
      }
    }

    setLoading(true)

    try {
      const totalInvoice = getTotalInvoice()

      const response = await ApiClient.post("/api/nfe", {
        ...nfeData,
        ...values,
        ...payment,
        totalInvoice,
        items,
      })

      if (response.ok) {
        const data = await response.json()
        alert("NF-e cadastrada com sucesso!")
        router.push("/nfe")
      } else {
        const error = await response.json()
        alert(`Erro ao cadastrar NF-e: ${error.error}`)
      }
    } catch (error) {
      console.error("Error creating NFe:", error)
      alert("Erro ao cadastrar NF-e. Verifique se você está autenticado.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={() => router.push("/nfe")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nova Nota Fiscal de Entrada</h1>
            <p className="text-muted-foreground mt-1">Cadastre uma NF-e e atualize o estoque automaticamente</p>
          </div>
        </div>

        {/* Alerta informativo */}
        <Alert className="mb-6">
          <Package className="h-4 w-4" />
          <AlertDescription>
            Ao cadastrar esta NF-e, o estoque dos produtos será atualizado automaticamente e, se configurado, as contas
            a pagar serão criadas conforme as parcelas definidas.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Dados da NF-e */}
          <Card>
            <CardHeader>
              <CardTitle>Dados da Nota Fiscal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="vendor">Fornecedor *</Label>
                  <Select value={nfeData.vendorId} onValueChange={(value) => setNfeData({ ...nfeData, vendorId: value })} disabled={loadingData}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingData ? "Carregando fornecedores..." : vendors.length === 0 ? "Nenhum fornecedor cadastrado" : "Selecione o fornecedor"} />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum fornecedor encontrado. <br />
                          Cadastre um fornecedor primeiro.
                        </div>
                      ) : (
                        vendors.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name} - {vendor.cnpj}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="nfeNumber">Número da NF-e *</Label>
                  <Input
                    id="nfeNumber"
                    value={nfeData.nfeNumber}
                    onChange={(e) => setNfeData({ ...nfeData, nfeNumber: e.target.value })}
                    placeholder="Ex: 123456"
                  />
                </div>

                <div>
                  <Label htmlFor="nfeSeries">Série *</Label>
                  <Input
                    id="nfeSeries"
                    value={nfeData.nfeSeries}
                    onChange={(e) => setNfeData({ ...nfeData, nfeSeries: e.target.value })}
                    placeholder="Ex: 1"
                  />
                </div>

                <div>
                  <Label htmlFor="nfeAccessKey">Chave de Acesso (44 dígitos)</Label>
                  <Input
                    id="nfeAccessKey"
                    value={nfeData.nfeAccessKey}
                    onChange={(e) => setNfeData({ ...nfeData, nfeAccessKey: e.target.value })}
                    placeholder="44 dígitos"
                    maxLength={44}
                  />
                </div>

                <div>
                  <Label htmlFor="nfeProtocol">Protocolo</Label>
                  <Input
                    id="nfeProtocol"
                    value={nfeData.nfeProtocol}
                    onChange={(e) => setNfeData({ ...nfeData, nfeProtocol: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="issueDate">Data de Emissão *</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={nfeData.issueDate}
                    onChange={(e) => setNfeData({ ...nfeData, issueDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="receiptDate">Data de Recebimento *</Label>
                  <Input
                    id="receiptDate"
                    type="date"
                    value={nfeData.receiptDate}
                    onChange={(e) => setNfeData({ ...nfeData, receiptDate: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="cfop">CFOP</Label>
                  <Input
                    id="cfop"
                    value={nfeData.cfop}
                    onChange={(e) => setNfeData({ ...nfeData, cfop: e.target.value })}
                    placeholder="Ex: 5102"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={nfeData.notes}
                    onChange={(e) => setNfeData({ ...nfeData, notes: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Adicionar Item */}
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Item</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2 lg:col-span-3">
                  <Label htmlFor="product">Produto *</Label>
                  <Select value={currentItem.productId} onValueChange={handleProductSelect} disabled={loadingData}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingData ? "Carregando produtos..." : products.length === 0 ? "Nenhum produto cadastrado" : "Selecione o produto"} />
                    </SelectTrigger>
                    <SelectContent>
                      {products.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground text-center">
                          Nenhum produto encontrado. <br />
                          Cadastre um produto primeiro.
                        </div>
                      ) : (
                        products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            #{product.code} - {product.name} (Estoque: {product.quantity})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="unit">Unidade</Label>
                  <Select value={currentItem.unit} onValueChange={(value) => setCurrentItem({ ...currentItem, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">Unidade (UN)</SelectItem>
                      <SelectItem value="KG">Quilograma (KG)</SelectItem>
                      <SelectItem value="MT">Metro (MT)</SelectItem>
                      <SelectItem value="CX">Caixa (CX)</SelectItem>
                      <SelectItem value="PC">Peça (PC)</SelectItem>
                      <SelectItem value="LT">Litro (LT)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.0001"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="unitPrice">Preço Unitário (R$) *</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    step="0.01"
                    value={currentItem.unitPrice}
                    onChange={(e) => setCurrentItem({ ...currentItem, unitPrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="discount">Desconto (R$)</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    value={currentItem.discount}
                    onChange={(e) => setCurrentItem({ ...currentItem, discount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Label htmlFor="itemTotal">Total</Label>
                  <Input id="itemTotal" value={calculateItemTotal()} readOnly className="font-semibold" />
                </div>

                <div>
                  <Label htmlFor="ncm">NCM</Label>
                  <Input
                    id="ncm"
                    value={currentItem.ncm}
                    onChange={(e) => setCurrentItem({ ...currentItem, ncm: e.target.value })}
                    placeholder="8 dígitos"
                  />
                </div>
              </div>

              <Button onClick={addItem} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            </CardContent>
          </Card>

          {/* Lista de Itens */}
          {items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Itens da Nota Fiscal ({items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.productDescription}</div>
                        <div className="text-sm text-muted-foreground">
                          Qtd: {item.quantity} {item.unit} × R$ {item.unitPrice} = R$ {item.totalPrice}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeItem(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Valores e Impostos */}
          <Card>
            <CardHeader>
              <CardTitle>Valores e Impostos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Total de Produtos</Label>
                  <Input value={values.totalProducts} readOnly className="font-semibold" />
                </div>

                <div>
                  <Label htmlFor="freightValue">Frete (R$)</Label>
                  <Input
                    id="freightValue"
                    type="number"
                    step="0.01"
                    value={values.freightValue}
                    onChange={(e) => setValues({ ...values, freightValue: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="insuranceValue">Seguro (R$)</Label>
                  <Input
                    id="insuranceValue"
                    type="number"
                    step="0.01"
                    value={values.insuranceValue}
                    onChange={(e) => setValues({ ...values, insuranceValue: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="discountValue">Desconto (R$)</Label>
                  <Input
                    id="discountValue"
                    type="number"
                    step="0.01"
                    value={values.discountValue}
                    onChange={(e) => setValues({ ...values, discountValue: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="otherExpenses">Outras Despesas (R$)</Label>
                  <Input
                    id="otherExpenses"
                    type="number"
                    step="0.01"
                    value={values.otherExpenses}
                    onChange={(e) => setValues({ ...values, otherExpenses: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="totalTax">Total de Impostos (R$)</Label>
                  <Input
                    id="totalTax"
                    type="number"
                    step="0.01"
                    value={values.totalTax}
                    onChange={(e) => setValues({ ...values, totalTax: e.target.value })}
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Valor Total da Nota:</span>
                  <span className="text-2xl">R$ {getTotalInvoice()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informações de Pagamento */}
          <Card>
            <CardHeader>
              <CardTitle>Informações de Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="paymentStatus">Status do Pagamento</Label>
                  <Select value={payment.paymentStatus} onValueChange={(value) => setPayment({ ...payment, paymentStatus: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente (a prazo)</SelectItem>
                      <SelectItem value="paid">Pago (à vista)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Método de Pagamento</Label>
                  <Select value={payment.paymentMethod} onValueChange={(value) => setPayment({ ...payment, paymentMethod: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Boleto">Boleto</SelectItem>
                      <SelectItem value="Transferência">Transferência</SelectItem>
                      <SelectItem value="PIX">PIX</SelectItem>
                      <SelectItem value="Cartão">Cartão</SelectItem>
                      <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="paymentCategory">Categoria da Despesa</Label>
                  <Select value={payment.paymentCategory} onValueChange={(value) => setPayment({ ...payment, paymentCategory: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Compras">Compras</SelectItem>
                      <SelectItem value="Impostos">Impostos</SelectItem>
                      <SelectItem value="Salários">Salários</SelectItem>
                      <SelectItem value="Aluguel">Aluguel</SelectItem>
                      <SelectItem value="Energia">Energia</SelectItem>
                      <SelectItem value="Água">Água</SelectItem>
                      <SelectItem value="Internet">Internet</SelectItem>
                      <SelectItem value="Telefone">Telefone</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                      <SelectItem value="Outras Despesas">Outras Despesas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {payment.paymentStatus === "pending" && (
                  <>
                    <div>
                      <Label htmlFor="installments">Número de Parcelas</Label>
                      <Input
                        id="installments"
                        type="number"
                        min="1"
                        value={payment.installments}
                        onChange={(e) => setPayment({ ...payment, installments: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label htmlFor="firstDueDate">Data do Primeiro Vencimento *</Label>
                      <Input
                        id="firstDueDate"
                        type="date"
                        value={payment.firstDueDate}
                        onChange={(e) => setPayment({ ...payment, firstDueDate: e.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="paymentTerms">Condições de Pagamento</Label>
                      <Input
                        id="paymentTerms"
                        value={payment.paymentTerms}
                        onChange={(e) => setPayment({ ...payment, paymentTerms: e.target.value })}
                        placeholder="Ex: 30/60/90 dias"
                      />
                    </div>
                  </>
                )}
              </div>

              {payment.paymentStatus === "pending" && parseInt(payment.installments) > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {parseInt(payment.installments) === 1
                      ? "Será criada 1 conta a pagar"
                      : `Serão criadas ${payment.installments} contas a pagar, sendo a primeira no dia ${payment.firstDueDate || "..."} e as demais a cada 30 dias`}
                  </AlertDescription>
                </Alert>
              )}

              {payment.paymentStatus === "paid" && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Como a nota foi paga à vista, será criado um lançamento no fluxo de caixa como saída (despesa) na data de recebimento.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Botões de Ação */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => router.push("/nfe")} className="flex-1">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Cadastrar NF-e"}
            </Button>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
