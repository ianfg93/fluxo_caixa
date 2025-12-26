"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { BudgetService, type CreateBudgetDTO } from "@/lib/budgets"
import { BudgetTemplateService, type BudgetTemplate } from "@/lib/budget-templates"
import { ProductService, type Product } from "@/lib/products"
import { CustomerService, type Customer } from "@/lib/customers"
import { Plus, Trash2, Save } from "lucide-react"

interface BudgetItem {
  productId?: string
  itemType: 'product' | 'custom'
  description: string
  quantity: number
  unitPrice: number
}

export default function NewBudgetPage() {
  const router = useRouter()
  const { authState } = useAuth()
  const [templates, setTemplates] = useState<BudgetTemplate[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [isNewCustomer, setIsNewCustomer] = useState(false)
  const [items, setItems] = useState<BudgetItem[]>([])
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    validityDate: "",
    discount: 0,
    notes: "",
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authState.isAuthenticated) {
      router.push("/")
      return
    }

    loadData()
  }, [authState, router])

  const loadData = async () => {
    setLoading(true)
    const [templatesData, productsData, customersData] = await Promise.all([
      BudgetTemplateService.getTemplates(),
      ProductService.getProducts(),
      CustomerService.getCustomers(true),
    ])
    setTemplates(templatesData)
    setProducts(productsData)
    setCustomers(customersData)

    // Selecionar template padrão automaticamente
    const defaultTemplate = templatesData.find(t => t.isDefault)
    if (defaultTemplate) {
      setSelectedTemplateId(defaultTemplate.id)
    }

    setLoading(false)
  }

  const handleAddProductItem = () => {
    setItems([
      ...items,
      { itemType: 'product', description: '', quantity: 1, unitPrice: 0 },
    ])
  }

  const handleAddCustomItem = () => {
    setItems([
      ...items,
      { itemType: 'custom', description: '', quantity: 1, unitPrice: 0 },
    ])
  }

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleCustomerChange = (customerId: string) => {
    setSelectedCustomerId(customerId)

    if (customerId === "new") {
      setIsNewCustomer(true)
      setFormData({
        ...formData,
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerAddress: "",
      })
    } else if (customerId) {
      setIsNewCustomer(false)
      const customer = customers.find(c => c.id === customerId)
      if (customer) {
        setFormData({
          ...formData,
          customerName: customer.name,
          customerEmail: customer.email || "",
          customerPhone: customer.phone || "",
          customerAddress: customer.address || "",
        })
      }
    } else {
      setIsNewCustomer(false)
      setFormData({
        ...formData,
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerAddress: "",
      })
    }
  }

  const handleItemChange = (index: number, field: keyof BudgetItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // Se for seleção de produto, preencher automaticamente
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value)
      if (product) {
        newItems[index].description = product.name
        newItems[index].unitPrice = product.price
      }
    }

    setItems(newItems)
  }

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
  }

  const calculateTotal = () => {
    return calculateSubtotal() - formData.discount
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedTemplateId) {
      alert("Selecione um template")
      return
    }

    if (items.length === 0) {
      alert("Adicione pelo menos um item ao orçamento")
      return
    }

    try {
      let customerId: string | undefined = undefined

      // Se for um cliente novo, criar primeiro
      if (isNewCustomer && formData.customerName) {
        const newCustomer = await CustomerService.createCustomer({
          name: formData.customerName,
          email: formData.customerEmail || undefined,
          phone: formData.customerPhone || undefined,
          address: formData.customerAddress || undefined,
        })
        customerId = newCustomer.id
      } else if (selectedCustomerId && selectedCustomerId !== "new") {
        customerId = selectedCustomerId
      }

      const budgetData: CreateBudgetDTO = {
        templateId: selectedTemplateId,
        customerId,
        customerName: formData.customerName || undefined,
        customerEmail: formData.customerEmail || undefined,
        customerPhone: formData.customerPhone || undefined,
        customerAddress: formData.customerAddress || undefined,
        validityDate: formData.validityDate ? new Date(formData.validityDate) : undefined,
        discount: formData.discount,
        notes: formData.notes || undefined,
        items: items.map(item => ({
          productId: item.productId,
          itemType: item.itemType,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      }

      const created = await BudgetService.createBudget(budgetData)
      if (created) {
        router.push("/budgets")
      } else {
        alert("Erro ao criar orçamento")
      }
    } catch (error) {
      console.error("Erro ao criar orçamento:", error)
      alert("Erro ao criar orçamento")
    }
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-2xl font-bold mb-6">Novo Orçamento</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Configurações</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Template</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Selecione um template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.isDefault && "(Padrão)"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Validade</label>
                <input
                  type="date"
                  value={formData.validityDate}
                  onChange={(e) => setFormData({ ...formData, validityDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Dados do Cliente</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Selecionar Cliente</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Selecione um cliente...</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} {customer.email && `(${customer.email})`}
                  </option>
                ))}
                <option value="new">+ Novo Cliente</option>
              </select>
            </div>

            {(isNewCustomer || selectedCustomerId) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nome</label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!isNewCustomer && selectedCustomerId !== ""}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">E-mail</label>
                  <input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!isNewCustomer && selectedCustomerId !== ""}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    disabled={!isNewCustomer && selectedCustomerId !== ""}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Endereço</label>
                  <textarea
                    value={formData.customerAddress}
                    onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    rows={2}
                    disabled={!isNewCustomer && selectedCustomerId !== ""}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Itens do Orçamento</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddProductItem}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  <Plus size={16} />
                  Produto
                </button>
                <button
                  type="button"
                  onClick={handleAddCustomItem}
                  className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  <Plus size={16} />
                  Item Livre
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-start border-b pb-3">
                  <div className="col-span-12 md:col-span-5">
                    {item.itemType === 'product' ? (
                      <>
                        <label className="block text-xs font-medium mb-1">Produto</label>
                        <select
                          value={item.productId || ''}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="">Selecione um produto</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} - {ProductService.formatPrice(product.price)}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : (
                      <>
                        <label className="block text-xs font-medium mb-1">Descrição</label>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                          placeholder="Digite a descrição"
                          required
                        />
                      </>
                    )}
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-xs font-medium mb-1">Qtd</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm"
                      required
                    />
                  </div>

                  <div className="col-span-4 md:col-span-2">
                    <label className="block text-xs font-medium mb-1">Preço Unit.</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))}
                      className="w-full px-2 py-1 border rounded text-sm"
                      required
                    />
                  </div>

                  <div className="col-span-3 md:col-span-2">
                    <label className="block text-xs font-medium mb-1">Total</label>
                    <div className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {BudgetService.formatPrice(item.quantity * item.unitPrice)}
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum item adicionado. Clique em "Produto" ou "Item Livre" para adicionar.
              </div>
            )}

            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-end space-y-2 flex-col items-end">
                <div className="flex gap-4 items-center">
                  <label className="text-sm font-medium">Subtotal:</label>
                  <div className="text-lg font-semibold">{BudgetService.formatPrice(calculateSubtotal())}</div>
                </div>

                <div className="flex gap-4 items-center">
                  <label className="text-sm font-medium">Desconto:</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.discount}
                    onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                    className="w-32 px-2 py-1 border rounded text-sm"
                  />
                </div>

                <div className="flex gap-4 items-center">
                  <label className="text-lg font-bold">TOTAL:</label>
                  <div className="text-2xl font-bold text-blue-600">{BudgetService.formatPrice(calculateTotal())}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Observações</h2>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={4}
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Save size={20} />
              Salvar Orçamento
            </button>
            <button
              type="button"
              onClick={() => router.push("/budgets")}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </AuthenticatedLayout>
  )
}
