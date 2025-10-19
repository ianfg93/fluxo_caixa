"use client"

import { useState } from "react"
import { type Customer } from "@/lib/customers"
import { Clock } from "lucide-react"
import { CustomersList } from "./customers-list"
import { CustomerDetail } from "./customer-detail"

export function AccountsReceivable() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  if (selectedCustomer) {
    return (
      <CustomerDetail 
        customer={selectedCustomer}
        onBack={() => setSelectedCustomer(null)}
        onUpdate={() => {
          // Força recarregar quando atualizar
          setSelectedCustomer(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="h-6 w-6 text-orange-600" />
        <div>
          <h1 className="text-2xl font-bold">Contas a Receber</h1>
          <p className="text-muted-foreground">
            Gerencie clientes e vendas a prazo
          </p>
        </div>
      </div>

      <CustomersList onSelectCustomer={setSelectedCustomer} />
    </div>
  )
}