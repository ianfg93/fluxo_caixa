"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Plus,
  ShoppingCart,
  Trash2,
  DollarSign,
  Clock,
  FileText,
  Receipt,
  X,
} from "lucide-react"
import { OpenOrderService, type OpenOrder } from "@/lib/open-orders"

interface OpenOrdersManagerProps {
  onSelectOrder: (order: OpenOrder) => void
}

export function OpenOrdersManager({ onSelectOrder }: OpenOrdersManagerProps) {
  const [orders, setOrders] = useState<OpenOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewOrderDialog, setShowNewOrderDialog] = useState(false)
  const [newOrderNumber, setNewOrderNumber] = useState("")

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    setLoading(true)
    const data = await OpenOrderService.getOpenOrders()
    setOrders(data)
    setLoading(false)
  }

  const handleCreateOrder = async () => {
    if (!newOrderNumber.trim()) {
      alert("Digite um identificador para a comanda")
      return
    }

    const result = await OpenOrderService.createOpenOrder({
      orderNumber: newOrderNumber.trim(),
    })

    if (result) {
      await loadOrders()
      setNewOrderNumber("")
      setShowNewOrderDialog(false)
      onSelectOrder(result)
    } else {
      alert("Erro ao criar comanda. Tente novamente.")
    }
  }

  const handleDeleteOrder = async (orderId: string, orderNumber: string) => {
    if (confirm(`Tem certeza que deseja excluir a comanda "${orderNumber}"?`)) {
      const success = await OpenOrderService.deleteOrder(orderId)
      if (success) {
        await loadOrders()
      } else {
        alert("Erro ao excluir comanda")
      }
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
  }

  const getItemsCount = (order: OpenOrder) => {
    return (order.items || []).reduce((sum, item) => sum + item.quantity, 0)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando comandas...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold text-lg">Comandas em Aberto</h3>
          {orders.length > 0 && (
            <Badge variant="secondary">{orders.length}</Badge>
          )}
        </div>

        <Dialog open={showNewOrderDialog} onOpenChange={setShowNewOrderDialog}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nova Comanda
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Comanda</DialogTitle>
              <DialogDescription>
                Digite um identificador para a comanda (ex: Mesa 1, Comanda #001, Cliente João)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="orderNumber">Identificador da Comanda</Label>
                <Input
                  id="orderNumber"
                  value={newOrderNumber}
                  onChange={(e) => setNewOrderNumber(e.target.value)}
                  placeholder="Ex: Mesa 1, Comanda #001"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateOrder()
                    }
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewOrderDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateOrder}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Nenhuma comanda aberta</p>
              <Button onClick={() => setShowNewOrderDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeira comanda
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-orange-300"
              onClick={() => onSelectOrder(order)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{order.orderNumber}</CardTitle>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteOrder(order.id, order.orderNumber)
                    }}
                    className="hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")} às{" "}
                    {new Date(order.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <ShoppingCart className="h-4 w-4 text-blue-600" />
                  <span>
                    {getItemsCount(order)} item(s)
                  </span>
                </div>

                {order.notes && (
                  <div className="flex items-start gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <p className="text-muted-foreground line-clamp-2">{order.notes}</p>
                  </div>
                )}

                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}