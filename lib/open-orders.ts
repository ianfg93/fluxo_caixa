import { ApiClient } from './api-client'

export interface OpenOrderItem {
  id: string
  orderId: string
  productId: string
  productName: string
  productPrice: number
  quantity: number
  subtotal: number
  addedAt: Date
}

export interface OpenOrder {
  id: string
  companyId: string
  orderNumber: string
  status: "open" | "closed" | "cancelled"
  subtotal: number
  extraAmount: number
  totalAmount: number
  notes: string | null
  createdBy: string
  createdAt: Date
  updatedAt: Date
  closedAt: Date | null
  closedBy: string | null
  items?: OpenOrderItem[]
}

export interface CreateOpenOrderData {
  orderNumber: string
  notes?: string
}

export interface AddItemToOrderData {
  orderId: string
  productId: string
  productName: string
  productPrice: number
  quantity: number
}

export class OpenOrderService {
  static async getOpenOrders(): Promise<OpenOrder[]> {
    try {
      const response = await ApiClient.get("/api/open-orders")

      if (!response.ok) {
        throw new Error("Failed to fetch open orders")
      }

      const data = await response.json()

      return (data.orders || []).map((order: any) => ({
        id: order.id,
        companyId: order.companyId,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: Number(order.subtotal),
        extraAmount: Number(order.extraAmount),
        totalAmount: Number(order.totalAmount),
        notes: order.notes,
        createdBy: order.createdBy,
        createdAt: new Date(order.createdAt),
        updatedAt: new Date(order.updatedAt),
        closedAt: order.closedAt ? new Date(order.closedAt) : null,
        closedBy: order.closedBy,
        items: (order.items || []).map((item: any) => ({
          id: item.id,
          orderId: item.orderId,
          productId: item.productId,
          productName: item.productName,
          productPrice: Number(item.productPrice),
          quantity: item.quantity,
          subtotal: Number(item.subtotal),
          addedAt: new Date(item.addedAt),
        })),
      }))
    } catch (error) {
      console.error("Erro ao buscar comandas abertas:", error)
      return []
    }
  }

  static async createOpenOrder(data: CreateOpenOrderData): Promise<OpenOrder | null> {
    try {
      const response = await ApiClient.post("/api/open-orders", data)

      if (!response.ok) {
        throw new Error("Failed to create open order")
      }

      const result = await response.json()

      return {
        id: result.order.id,
        companyId: result.order.companyId,
        orderNumber: result.order.orderNumber,
        status: result.order.status,
        subtotal: 0,
        extraAmount: 0,
        totalAmount: 0,
        notes: result.order.notes,
        createdBy: result.order.createdBy,
        createdAt: new Date(result.order.createdAt),
        updatedAt: new Date(result.order.updatedAt),
        closedAt: null,
        closedBy: null,
        items: [],
      }
    } catch (error) {
      console.error("Erro ao criar comanda:", error)
      return null
    }
  }

  static async addItemToOrder(data: AddItemToOrderData): Promise<{ success: boolean; itemId?: string }> {
    try {
      const response = await ApiClient.post(`/api/open-orders/${data.orderId}/items`, {
        productId: data.productId,
        productName: data.productName,
        productPrice: data.productPrice,
        quantity: data.quantity,
      })

      if (!response.ok) return { success: false }
      const result = await response.json()
      return { success: true, itemId: result.itemId }
    } catch (error) {
      console.error("Erro ao adicionar item:", error)
      return { success: false }
    }
  }

  static async updateItemQuantity(itemId: string, orderId: string, quantity: number): Promise<boolean> {
    try {
      const response = await ApiClient.patch(`/api/open-orders/${orderId}/items/${itemId}`, { quantity })
      return response.ok
    } catch (error) {
      console.error("Erro ao atualizar quantidade do item:", error)
      return false
    }
  }

  static async removeItemFromOrder(itemId: string, orderId: string): Promise<boolean> {
    try {
      const response = await ApiClient.delete(`/api/open-orders/${orderId}/items/${itemId}`)
      return response.ok
    } catch (error) {
      console.error("Erro ao remover item:", error)
      return false
    }
  }

  static async updateOrderExtraAmount(orderId: string, extraAmount: number): Promise<boolean> {
    try {
      const response = await ApiClient.put(`/api/open-orders/${orderId}`, {
        extraAmount,
      })

      return response.ok
    } catch (error) {
      console.error("Erro ao atualizar valor extra:", error)
      return false
    }
  }

  static async updateOrderNotes(orderId: string, notes: string): Promise<boolean> {
    try {
      const response = await ApiClient.put(`/api/open-orders/${orderId}`, {
        notes: notes || null,
      })

      return response.ok
    } catch (error) {
      console.error("Erro ao atualizar observações:", error)
      return false
    }
  }

  static async closeOrder(orderId: string): Promise<boolean> {
    try {
      const response = await ApiClient.post(`/api/open-orders/${orderId}/close`, {})
      return response.ok
    } catch (error) {
      console.error("Erro ao fechar comanda:", error)
      return false
    }
  }

  static async deleteOrder(orderId: string): Promise<boolean> {
    try {
      const response = await ApiClient.delete(`/api/open-orders/${orderId}`)
      return response.ok
    } catch (error) {
      console.error("Erro ao excluir comanda:", error)
      return false
    }
  }
}