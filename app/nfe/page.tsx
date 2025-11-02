"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, FileText, Eye, Ban, Filter, Download, TrendingUp, TrendingDown, Package } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { ApiClient } from "@/lib/api-client"

interface NFeInvoice {
  id: string
  nfeNumber: string
  nfeSeries: string
  nfeAccessKey?: string
  issueDate: string
  receiptDate: string
  totalProducts: number
  totalInvoice: number
  paymentStatus: string
  paymentMethod?: string
  paymentTerms?: string
  installments: number
  operationType: string
  notes?: string
  stockUpdated: boolean
  accountsPayableCreated: boolean
  status: string
  vendorName: string
  vendorCnpj: string
  createdByName: string
  createdAt: string
}

export default function NFePage() {
  const [invoices, setInvoices] = useState<NFeInvoice[]>([])
  const [loading, setLoading] = useState(true)
  const { authState } = useAuth()
  const router = useRouter()

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("active")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all")

  useEffect(() => {
    loadInvoices()
  }, [statusFilter])

  const loadInvoices = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }

      const response = await ApiClient.get(`/api/nfe?${params.toString()}`)

      if (response.ok) {
        const data = await response.json()
        setInvoices(data.invoices || [])
      } else {
        console.error("Failed to load invoices")
      }
    } catch (error) {
      console.error("Error loading invoices:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR")
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Ativa", variant: "default" },
      cancelled: { label: "Cancelada", variant: "destructive" },
      returned: { label: "Devolvida", variant: "secondary" },
    }

    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      pending: { label: "Pendente", variant: "secondary" },
      paid: { label: "Pago", variant: "default" },
      partially_paid: { label: "Parcialmente Pago", variant: "outline" },
      overdue: { label: "Vencido", variant: "destructive" },
    }

    const statusInfo = statusMap[status] || { label: status, variant: "outline" as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  // Filtrar invoices
  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      searchTerm === "" ||
      invoice.nfeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendorCnpj.includes(searchTerm)

    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter
    const matchesPaymentStatus = paymentStatusFilter === "all" || invoice.paymentStatus === paymentStatusFilter

    return matchesSearch && matchesStatus && matchesPaymentStatus
  })

  // Calcular totais
  const totalValue = filteredInvoices.reduce((sum, inv) => sum + parseFloat(String(inv.totalInvoice || 0)), 0)
  const totalActive = filteredInvoices.filter((inv) => inv.status === "active").length
  const totalPending = filteredInvoices.filter((inv) => inv.status !== 'cancelled' && inv.paymentStatus === "pending").length

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notas Fiscais de Entrada</h1>
            <p className="text-muted-foreground mt-1">Gerenciar NF-e e controlar estoque automaticamente</p>
          </div>
          <Button
            onClick={() => router.push("/nfe/new")}
            className="md:w-auto w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova NF-e
          </Button>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">Filtros:</span>
              </div>
              <Input
                placeholder="Buscar por número, fornecedor ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 min-w-[200px] h-8 text-sm"
              />
              <select
                className="px-3 py-1.5 border rounded-md text-sm min-w-[140px]"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos Status</option>
                <option value="active">Ativa</option>
                <option value="cancelled">Cancelada</option>
              </select>
              <select
                className="px-3 py-1.5 border rounded-md text-sm min-w-[140px]"
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
              >
                <option value="all">Todos Pagamentos</option>
                <option value="pending">Pendente</option>
                <option value="paid">Pago</option>
                <option value="partially_paid">Parcialmente Pago</option>
                <option value="overdue">Vencido</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Indicadores */}
        <div>
          <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Indicadores</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Notas Ativas</p>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-2xl font-bold">{totalActive}</p>
                <p className="text-xs text-muted-foreground mt-1">NF-e processadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Pagamentos Pendentes</p>
                  <TrendingDown className="h-4 w-4 text-orange-600" />
                </div>
                <p className="text-2xl font-bold">{totalPending}</p>
                <p className="text-xs text-muted-foreground mt-1">Aguardando pagamento</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Valor Total</p>
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">Notas filtradas</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Lista de NF-e */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Carregando notas fiscais...</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">Nenhuma NF-e encontrada</p>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "all" || paymentStatusFilter !== "all"
                  ? "Tente ajustar os filtros de busca"
                  : "Comece cadastrando sua primeira nota fiscal"}
              </p>
              {!searchTerm && statusFilter === "all" && paymentStatusFilter === "all" && (
                <Button onClick={() => router.push("/nfe/new")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Cadastrar NF-e
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredInvoices.map((invoice) => (
              <Card key={invoice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          NF-e {invoice.nfeNumber}/{invoice.nfeSeries}
                        </h3>
                        {getStatusBadge(invoice.status)}
                        {invoice.status !== 'cancelled' && getPaymentStatusBadge(invoice.paymentStatus)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>
                          <strong>Fornecedor:</strong> {invoice.vendorName}
                        </div>
                        <div>
                          <strong>CNPJ:</strong> {invoice.vendorCnpj}
                        </div>
                        <div>
                          <strong>Emissão:</strong> {formatDate(invoice.issueDate)}
                        </div>
                        <div>
                          <strong>Recebimento:</strong> {formatDate(invoice.receiptDate)}
                        </div>
                        <div>
                          <strong>Valor:</strong>{" "}
                          <span className="text-foreground font-semibold">
                            {formatCurrency(invoice.totalInvoice)}
                          </span>
                        </div>
                        {invoice.installments > 1 && (
                          <div>
                            <strong>Parcelas:</strong> {invoice.installments}x
                          </div>
                        )}
                      </div>
                      {invoice.status !== 'cancelled' && (
                        <div className="flex gap-4 mt-3 text-xs">
                          {invoice.stockUpdated && (
                            <div className="flex items-center gap-1 text-green-600">
                              <Package className="h-3 w-3" />
                              <span>Estoque atualizado</span>
                            </div>
                          )}
                          {invoice.accountsPayableCreated && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <FileText className="h-3 w-3" />
                              <span>Contas a pagar geradas</span>
                            </div>
                          )}
                          {invoice.paymentStatus === 'paid' && invoice.stockUpdated && (
                            <div className="flex items-center gap-1 text-purple-600">
                              <TrendingDown className="h-3 w-3" />
                              <span>Saída registrada</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/nfe/${invoice.id}`)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Ver Detalhes
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
