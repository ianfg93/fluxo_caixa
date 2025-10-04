import { ApiClient } from './api-client'

export interface Product {
  id: string
  code: number
  name: string
  quantity: number
  companyId: string
  createdAt: Date
  updatedAt: Date
}

export interface StockMovement {
  id: string
  productId: string
  transactionId?: string
  quantity: number
  type: 'sale' | 'adjustment'
  notes?: string
  createdBy: string
  createdAt: Date
}

export class ProductService {
  static async getProducts(companyId?: string): Promise<Product[]> {
    try {
      let url = "/api/products"
      
      if (companyId) {
        url += `?company=${companyId}`
      }

      const response = await ApiClient.get(url)

      if (!response.ok) {
        throw new Error("Failed to fetch products")
      }

      const data = await response.json()

      return data.products.map((p: any) => ({
        ...p,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      }))
    } catch (error) {
      console.error("Get products error:", error)
      return []
    }
  }

  static async getProduct(id: string): Promise<Product | null> {
    try {
      const response = await ApiClient.get(`/api/products/${id}`)

      if (!response.ok) {
        throw new Error("Failed to fetch product")
      }

      const data = await response.json()

      return {
        ...data.product,
        createdAt: new Date(data.product.createdAt),
        updatedAt: new Date(data.product.updatedAt),
      }
    } catch (error) {
      console.error("Get product error:", error)
      return null
    }
  }

  static async addProduct(
    product: Omit<Product, "id" | "code" | "createdAt" | "updatedAt" | "companyId">
  ): Promise<Product | null> {
    try {
      const response = await ApiClient.post("/api/products", product)

      if (!response.ok) {
        throw new Error("Failed to add product")
      }

      const data = await response.json()

      return {
        ...data.product,
        createdAt: new Date(data.product.createdAt),
        updatedAt: new Date(data.product.updatedAt),
      }
    } catch (error) {
      console.error("Add product error:", error)
      return null
    }
  }

  static async updateProduct(
    id: string,
    updates: Partial<Pick<Product, "name" | "quantity">>
  ): Promise<Product | null> {
    try {
      const response = await ApiClient.put(`/api/products/${id}`, updates)

      if (!response.ok) {
        throw new Error("Failed to update product")
      }

      const data = await response.json()

      return {
        ...data.product,
        createdAt: new Date(data.product.createdAt),
        updatedAt: new Date(data.product.updatedAt),
      }
    } catch (error) {
      console.error("Update product error:", error)
      return null
    }
  }

  static async deleteProduct(id: string): Promise<boolean> {
    try {
      const response = await ApiClient.delete(`/api/products/${id}`)
      return response.ok
    } catch (error) {
      console.error("Delete product error:", error)
      return false
    }
  }

  static async getStockMovements(productId: string): Promise<StockMovement[]> {
    try {
      const response = await ApiClient.get(`/api/products/${productId}/movements`)

      if (!response.ok) {
        throw new Error("Failed to fetch stock movements")
      }

      const data = await response.json()

      return data.movements.map((m: any) => ({
        ...m,
        createdAt: new Date(m.createdAt),
      }))
    } catch (error) {
      console.error("Get stock movements error:", error)
      return []
    }
  }
}