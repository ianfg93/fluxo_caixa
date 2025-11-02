"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Search, DollarSign, AlertCircle } from "lucide-react"
import { CustomerService, type Customer } from "@/lib/customers"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CustomerForm } from "./customer-form"

interface CustomersListProps {
  onSelectCustomer: (customer: Customer) => void
}

export function CustomersList({ onSelectCustomer }: CustomersListProps) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<"all" | "debtors" | "paid">("all")

  const loadCustomers = async () => {
    try {
      setLoading(true)
      const data = await CustomerService.getCustomers(true)
      setCustomers(data)
      setFilteredCustomers(data)
    } catch (error) {
      console.error("Erro ao carregar clientes:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCustomers()
  }, [])

  useEffect(() => {
    let filtered = customers

    // Filtro por status de dívida
    if (filterStatus === "debtors") {
      filtered = filtered.filter(customer => customer.balance && customer.balance > 0)
    } else if (filterStatus === "paid") {
      filtered = filtered.filter(customer => customer.balance === 0 && customer.totalDebt && customer.totalDebt > 0)
    }

    // Filtro por termo de busca
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchLower) ||
          customer.cpfCnpj?.toLowerCase().includes(searchLower) ||
          customer.phone?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredCustomers(filtered)
  }, [searchTerm, customers, filterStatus])

  const handleSuccess = () => {
    loadCustomers()
    setShowForm(false)
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  // Calcular estatísticas
  const totalCustomers = customers.length
  const debtorsCount = customers.filter(c => c.balance && c.balance > 0).length
  const paidCount = customers.filter(c => c.balance === 0 && c.totalDebt && c.totalDebt > 0).length
  const totalDebt = customers.reduce((sum, c) => sum + (c.balance || 0), 0)

  if (showForm) {
    return <CustomerForm onSuccess={handleSuccess} onCancel={() => setShowForm(false)} />
  }

  return (
    <div className="space-y-6">
      {/* Indicadores de estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Clientes</p>
                <p className="text-3xl font-bold mt-2">{totalCustomers}</p>
              </div>
              <Users className="h-10 w-10 text-blue-600 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Devedores</p>
                <p className="text-3xl font-bold mt-2 text-red-600">{debtorsCount}</p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-600 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Quitados</p>
                <p className="text-3xl font-bold mt-2 text-green-600">{paidCount}</p>
              </div>
              <DollarSign className="h-10 w-10 text-green-600 opacity-75" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total a Receber</p>
                <p className="text-2xl font-bold mt-2 text-orange-600">{formatCurrency(totalDebt)}</p>
              </div>
              <DollarSign className="h-10 w-10 text-orange-600 opacity-75" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={filterStatus === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("all")}
            >
              <Users className="h-4 w-4 mr-2" />
              Todos
            </Button>
            <Button
              variant={filterStatus === "debtors" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("debtors")}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Devedores
            </Button>
            <Button
              variant={filterStatus === "paid" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus("paid")}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Quitados
            </Button>
          </div>
          {!loading && (
            <p className="text-sm text-muted-foreground">
              {filteredCustomers.length} {filteredCustomers.length === 1 ? 'cliente' : 'clientes'}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <Label htmlFor="search" className="sr-only">Buscar Cliente</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Buscar por nome, CPF/CNPJ ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Carregando clientes...</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCustomers.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {customers.length === 0 
                      ? "Nenhum cliente cadastrado"
                      : "Nenhum cliente encontrado com os critérios de busca"}
                  </p>
                  {customers.length === 0 && (
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Primeiro Cliente
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredCustomers.map((customer) => (
              <Card 
                key={customer.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onSelectCustomer(customer)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{customer.name}</h3>
                        {customer.balance && customer.balance > 0 && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Devendo
                          </Badge>
                        )}
                        {customer.balance === 0 && customer.totalDebt && customer.totalDebt > 0 && (
                          <Badge variant="default" className="bg-green-600">
                            Quitado
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-muted-foreground">
                        {customer.cpfCnpj && (
                          <div>
                            <span className="font-medium">CPF/CNPJ:</span> {customer.cpfCnpj}
                          </div>
                        )}
                        {customer.phone && (
                          <div>
                            <span className="font-medium">Telefone:</span> {customer.phone}
                          </div>
                        )}
                        {customer.email && (
                          <div>
                            <span className="font-medium">Email:</span> {customer.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      {customer.balance !== undefined && (
                        <>
                          <p className="text-sm text-muted-foreground mb-1">Saldo Devedor</p>
                          <p className={`text-2xl font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(customer.balance)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}