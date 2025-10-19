"use client"

import { AccountsReceivable } from "@/components/accounts-receivable/accounts-receivable"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"

export default function AccountsReceivablePage() {
  return (
    <AuthenticatedLayout>
      <AccountsReceivable />
    </AuthenticatedLayout>
    )
}