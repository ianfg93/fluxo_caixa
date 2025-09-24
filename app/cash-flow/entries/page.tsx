import { TransactionList } from "@/components/cash-flow/transaction-list"
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout"

export default function EntriesPage() {
  return (
    <AuthenticatedLayout>
      <TransactionList type="entry" />
    </AuthenticatedLayout>
  )
}