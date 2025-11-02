"use client"

import { useState, useEffect } from "react"
import { OpenOrderService } from "@/lib/open-orders"

export function useOpenOrdersCount() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchCount = async () => {
    try {
      const orders = await OpenOrderService.getOpenOrders()
      setCount(orders.length)
    } catch (error) {
      console.error("Erro ao buscar contagem de comandas:", error)
      setCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCount()

    // Atualizar a contagem a cada 30 segundos
    const interval = setInterval(fetchCount, 30000)

    return () => clearInterval(interval)
  }, [])

  return { count, loading, refresh: fetchCount }
}
