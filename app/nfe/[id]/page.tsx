"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, FileText, Package, DollarSign, Calendar, Ban, Edit } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ApiClient } from "@/lib/api-client"

interface NFEItem {
  id: string
  itemNumber: number
  productCode: string
  productDescription: string
  productName: string
  productInternalCode: number
  unit: string
  quantity: string
  unitPrice: string
  totalPrice: string
  discount: string
  ncm?: string
  cfop?: string
  notes?: string
}

interface NFEInvoice {
  id: string
  nfeNumber: string
  nfeSeries: string
  nfeAccessKey?: string
  nfeProtocol?: string
  issueDate: string
  receiptDate: string
  totalProducts: number
  totalTax: number
  freightValue: number
  insuranceValue: number
  discountValue: number
  otherExpenses: number
  totalInvoice: number
  paymentStatus: string
  paymentMethod?: string
  paymentTerms?: string
  installments: number
  firstDueDate?: string
  icmsValue: number
  ipiValue: number
  pisValue: number
  cofinsValue: number
  operationType: string
  cfop?: string
  notes?: string
  stockUpdated: boolean
  stockUpdatedAt?: string
  accountsPayableCreated: boolean
  status: string
  cancellationReason?: string
  cancelledAt?: string
  vendorId: string
  vendorName: string
  vendorCnpj: string
  vendorEmail?: string
  vendorPhone?: string
  vendorAddress?: string
  createdByName: string
  createdAt: string
  updatedAt: string
  items: NFEItem[]
}

export default function NFEDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { authState } = useAuth()
  const [invoice, setInvoice] = useState<NFEInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCancelDialog, setShowCancelDialog] = useState(false)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadInvoice()
  }, [params.id])

  const loadInvoice = async () => {
    setLoading(true)
    try {
      const response = await ApiClient.get(`/api/nfe/${params.id}`)

      if (response.ok) {
        const data = await response.json()
        setInvoice(data.invoice)
      } else {
        alert("Erro ao carregar NF-e")
        router.push("/nfe")
      }
    } catch (error) {
      console.error("Error loading invoice:", error)
      alert("Erro ao carregar NF-e")
      router.push("/nfe")
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = async () => {
    if (!confirm("Processar esta NF-e? O estoque será atualizado e as contas a pagar serão criadas (se aplicável).")) {
      return
    }

    setProcessing(true)
    try {
      const response = await ApiClient.post(`/api/nfe/${params.id}/process`, {})

      if (response.ok) {
        alert("NF-e processada com sucesso!")
        loadInvoice()
      } else {
        const error = await response.json()
        alert(`Erro ao processar NF-e: ${error.error}`)
      }
    } catch (error) {
      console.error("Error processing invoice:", error)
      alert("Erro ao processar NF-e")
    } finally {
      setProcessing(false)
    }
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert("Informe o motivo do cancelamento")
      return
    }

    setCancelling(true)
    try {
      const response = await ApiClient.delete(`/api/nfe/${params.id}`, { reason: cancelReason })

      if (response.ok) {
        alert("NF-e cancelada com sucesso")
        loadInvoice()
        setShowCancelDialog(false)
        setCancelReason("")
      } else {
        const error = await response.json()
        alert(`Erro ao cancelar NF-e: ${error.error}`)
      }
    } catch (error) {
      console.error("Error cancelling invoice:", error)
      alert("Erro ao cancelar NF-e")
    } finally {
      setCancelling(false)
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("pt-BR")
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      active: { label: "Ativa", variant: "default" },
      cancelled: { label: "Cancelada", variant: "destructive" },
      returned: { label: "Devolvida", variant: "secondary" },
    }

    const statusInfo = statusMap[status] || { label: status, variant: "default" as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const getPaymentStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      pending: { label: "Pendente", variant: "secondary" },
      paid: { label: "Pago", variant: "default" },
      partially_paid: { label: "Parcialmente Pago", variant: "secondary" },
      overdue: { label: "Vencido", variant: "destructive" },
    }

    const statusInfo = statusMap[status] || { label: status, variant: "secondary" as const }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="container mx-auto py-6 px-4">
          <p className="text-center text-muted-foreground">Carregando...</p>
        </div>
      </AuthenticatedLayout>
    )
  }

  if (!invoice) {
    return null
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/nfe")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  NF-e {invoice.nfeNumber}/{invoice.nfeSeries}
                </h1>
                {getStatusBadge(invoice.status)}
                {invoice.status !== 'cancelled' && getPaymentStatusBadge(invoice.paymentStatus)}
              </div>
              <p className="text-muted-foreground mt-1">Cadastrada em {formatDateTime(invoice.createdAt)}</p>
            </div>
          </div>

          {invoice.status === "active" && (
            <div className="flex gap-2">
              <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
                <Ban className="mr-2 h-4 w-4" />
                Cancelar NF-e
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna Principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Dados da Nota */}
            <Card>
              <CardHeader>
                <CardTitle>Dados da Nota Fiscal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Número</Label>
                    <p className="font-medium">{invoice.nfeNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Série</Label>
                    <p className="font-medium">{invoice.nfeSeries}</p>
                  </div>
                  {invoice.nfeAccessKey && (
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Chave de Acesso</Label>
                      <p className="font-mono text-xs">{invoice.nfeAccessKey}</p>
                    </div>
                  )}
                  {invoice.nfeProtocol && (
                    <div>
                      <Label className="text-muted-foreground">Protocolo</Label>
                      <p className="font-medium">{invoice.nfeProtocol}</p>
                    </div>
                  )}
                  {invoice.cfop && (
                    <div>
                      <Label className="text-muted-foreground">CFOP</Label>
                      <p className="font-medium">{invoice.cfop}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Data de Emissão</Label>
                    <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Data de Recebimento</Label>
                    <p className="font-medium">{formatDate(invoice.receiptDate)}</p>
                  </div>
                </div>

                {invoice.notes && (
                  <div>
                    <Label className="text-muted-foreground">Observações</Label>
                    <p className="text-sm mt-1">{invoice.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Itens */}
            <Card>
              <CardHeader>
                <CardTitle>Itens da Nota ({invoice.items.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.items.map((item) => (
                    <div key={item.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <div className="font-medium">{item.productDescription}</div>
                          <div className="text-sm text-muted-foreground">
                            Produto interno: #{item.productInternalCode} - {item.productName}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatCurrency(parseFloat(item.totalPrice))}</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Quantidade:</span> {item.quantity} {item.unit}
                        </div>
                        <div>
                          <span className="font-medium">Preço Unit.:</span> {formatCurrency(parseFloat(item.unitPrice))}
                        </div>
                        {parseFloat(item.discount) > 0 && (
                          <div>
                            <span className="font-medium">Desconto:</span> {formatCurrency(parseFloat(item.discount))}
                          </div>
                        )}
                        {item.ncm && (
                          <div>
                            <span className="font-medium">NCM:</span> {item.ncm}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Status de Processamento - Oculto quando cancelada */}
            {invoice.status !== 'cancelled' && (
              <Card>
                <CardHeader>
                  <CardTitle>Status de Processamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Package className={invoice.stockUpdated ? "h-5 w-5 text-green-600" : "h-5 w-5 text-muted-foreground"} />
                    <div>
                      <p className="font-medium">
                        {invoice.stockUpdated ? "Estoque atualizado" : "Estoque não atualizado"}
                      </p>
                      {invoice.stockUpdatedAt && (
                        <p className="text-xs text-muted-foreground">
                          Processado em {formatDateTime(invoice.stockUpdatedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <DollarSign
                      className={invoice.accountsPayableCreated ? "h-5 w-5 text-blue-600" : "h-5 w-5 text-muted-foreground"}
                    />
                    <div>
                      <p className="font-medium">
                        {invoice.accountsPayableCreated ? "Contas a pagar criadas" : "Sem contas a pagar"}
                      </p>
                      {invoice.paymentStatus === "paid" && (
                        <p className="text-xs text-muted-foreground">Pagamento à vista registrado no fluxo de caixa</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cancelamento */}
            {invoice.status === "cancelled" && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Nota Fiscal Cancelada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {invoice.cancelledAt && (
                      <div>
                        <Label className="text-muted-foreground">Data do Cancelamento</Label>
                        <p>{formatDateTime(invoice.cancelledAt)}</p>
                      </div>
                    )}
                    {invoice.cancellationReason && (
                      <div>
                        <Label className="text-muted-foreground">Motivo</Label>
                        <p>{invoice.cancellationReason}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Coluna Lateral */}
          <div className="space-y-6">
            {/* Fornecedor */}
            <Card>
              <CardHeader>
                <CardTitle>Fornecedor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <Label className="text-muted-foreground">Nome</Label>
                  <p className="font-medium">{invoice.vendorName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">CNPJ</Label>
                  <p>{invoice.vendorCnpj}</p>
                </div>
                {invoice.vendorEmail && (
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p>{invoice.vendorEmail}</p>
                  </div>
                )}
                {invoice.vendorPhone && (
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p>{invoice.vendorPhone}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Valores */}
            <Card>
              <CardHeader>
                <CardTitle>Valores</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Produtos</span>
                  <span className="font-medium">{formatCurrency(invoice.totalProducts)}</span>
                </div>
                {invoice.freightValue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frete</span>
                    <span>{formatCurrency(invoice.freightValue)}</span>
                  </div>
                )}
                {invoice.insuranceValue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seguro</span>
                    <span>{formatCurrency(invoice.insuranceValue)}</span>
                  </div>
                )}
                {invoice.discountValue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Desconto</span>
                    <span className="text-green-600">-{formatCurrency(invoice.discountValue)}</span>
                  </div>
                )}
                {invoice.otherExpenses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Outras Despesas</span>
                    <span>{formatCurrency(invoice.otherExpenses)}</span>
                  </div>
                )}
                {invoice.totalTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Impostos</span>
                    <span>{formatCurrency(invoice.totalTax)}</span>
                  </div>
                )}
                <div className="border-t pt-2 flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.totalInvoice)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Pagamento - Oculto quando cancelada */}
            {invoice.status !== 'cancelled' && (
              <Card>
                <CardHeader>
                  <CardTitle>Pagamento</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getPaymentStatusBadge(invoice.paymentStatus)}</div>
                  </div>
                  {invoice.paymentMethod && (
                    <div>
                      <Label className="text-muted-foreground">Método</Label>
                      <p>{invoice.paymentMethod}</p>
                    </div>
                  )}
                  {invoice.installments > 1 && (
                    <div>
                      <Label className="text-muted-foreground">Parcelas</Label>
                      <p>{invoice.installments}x</p>
                    </div>
                  )}
                  {invoice.firstDueDate && (
                    <div>
                      <Label className="text-muted-foreground">Primeiro Vencimento</Label>
                      <p>{formatDate(invoice.firstDueDate)}</p>
                    </div>
                  )}
                  {invoice.paymentTerms && (
                    <div>
                      <Label className="text-muted-foreground">Condições</Label>
                      <p>{invoice.paymentTerms}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Auditoria */}
            <Card>
              <CardHeader>
                <CardTitle>Informações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <Label className="text-muted-foreground">Cadastrado por</Label>
                  <p>{invoice.createdByName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cadastrado em</Label>
                  <p>{formatDateTime(invoice.createdAt)}</p>
                </div>
                {invoice.updatedAt !== invoice.createdAt && (
                  <div>
                    <Label className="text-muted-foreground">Última atualização</Label>
                    <p>{formatDateTime(invoice.updatedAt)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog de Cancelamento */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Nota Fiscal</DialogTitle>
            <DialogDescription>
              O cancelamento da NF-e irá reverter o estoque e cancelar as contas a pagar pendentes. Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancelReason">Motivo do Cancelamento *</Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={cancelling}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? "Cancelando..." : "Cancelar NF-e"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthenticatedLayout>
  )
}
