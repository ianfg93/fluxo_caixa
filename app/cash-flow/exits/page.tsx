import { TransactionList } from "@/components/cash-flow/transaction-list"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"

export default function ExitsPage() {
  return (
    <AuthenticatedLayout>
      <TransactionList type="exit" />
    </AuthenticatedLayout>
  )
}